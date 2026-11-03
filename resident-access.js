const ResidentAccess = {
  parse(value) {
    const match = String(value).trim().toUpperCase().match(/^([A-F])[ -]*(1[0-3]|[1-9])(0[1-4])$/);
    return match ? this.flat(match[1], match[2], match[3]) : null;
  },
  flat(wing, floor, unit) {
    if (!/^[A-F]$/.test(wing) || !/^(?:[1-9]|1[0-3])$/.test(String(floor)) || !/^0[1-4]$/.test(unit)) return null;
    return `${wing}-${floor}${unit}`;
  },
  remembered(storage) {
    try { return this.parse(storage.getItem('saiVistaResidentFlat')); } catch (_) { return null; }
  },
  remember(storage, value) {
    try { const flat = this.parse(value); if (flat) storage.setItem('saiVistaResidentFlat', flat); } catch (_) { /* Storage may be disabled. */ }
  }
};
if (typeof module !== 'undefined') module.exports = ResidentAccess;
if (typeof document !== 'undefined') (() => {
  const config = window.SaiVistaVisitConfig || {};
  let storage; try { storage = window.localStorage; } catch (_) {}
  const gate = document.getElementById('residentGate');
  const form = document.getElementById('residentGateForm');
  const flatInput = document.getElementById('residentFlat');
  if (!config.endpoint) document.getElementById('residentLoggingNotice').textContent = 'Visit logging is not connected yet. Your verified resident access is remembered on this browser. Resident access also checks your registered flat/email and a verification code.';
  else if (!config.capturesIp) document.getElementById('residentLoggingNotice').textContent = 'The committee records your verified email, resident name, flat, sections viewed, selected actions, date/time and browser/device details in private records kept for 90 days. IP addresses are not collected with this connection. Resident access also checks your registered flat/email and a verification code.';
  window.SaiVistaGuest = true;
  const emailInput = document.getElementById('residentEmail');
  const otpForm = document.getElementById('residentOtpForm');
  const status = document.getElementById('residentGateStatus');
  const socialPanel=document.getElementById('residentSocialPanel'),emailFallback=document.getElementById('residentEmailFallback');
  let useSocial=window.SaiVistaSocialConfig?.enabled===true;
  if(useSocial){
    document.getElementById('residentEmailFields').hidden=true;emailInput.required=false;emailFallback.hidden=false;
    flatInput.required=false;
    form.querySelector('button[type="submit"]').textContent='Sign in / create account';
    document.getElementById('residentRememberNotice').textContent='Sign-in stays active for up to seven days. Residents: enter your own flat and use your registered email. Other visitors: leave the flat blank. Only verified residents can view restricted data.';
    document.getElementById('residentLoggingNotice').textContent=document.getElementById('residentLoggingNotice').textContent.replace('and a verification code','and a verified sign-in');
  }
  function emailMode(){requestVersion++;useSocial=false;window.SaiVistaSocialAuth?.clear();socialPanel.hidden=true;emailFallback.hidden=true;form.hidden=false;otpForm.hidden=true;document.getElementById('residentEmailFields').hidden=false;emailInput.required=true;flatInput.required=true;form.querySelector('button[type="submit"]').textContent='Send verification code';status.textContent='Email verification is available for registered residents. Social sign-in is available to everyone.';emailInput.focus();}
  emailFallback.onclick=emailMode;
  document.getElementById('residentSocialBack').onclick=emailMode;
  let challenge = '', pendingFlat = '', requestVersion = 0, retryAt = 0;
  let flat, queue = [], sending = false, activityObserver, activityTimer;
  const release=document.querySelector('meta[name="site-release"]').content;
  const sessionId = crypto.randomUUID();
  const device = { userAgent: navigator.userAgent.slice(0, 500), language: navigator.language, viewport: `${innerWidth}×${innerHeight}`, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  function record(type, target) {
    if (!window.SaiVistaAuthSession || !config.endpoint) return;
    queue.push({ id: crypto.randomUUID(), type, target, clientTime: new Date().toISOString() });
    if (queue.length > 100) queue.shift();
    if (queue.length >= 10) flush();
  }
  async function flush() {
    const identity=window.SaiVistaAuthSession;
    if (sending || !queue.length || !config.endpoint || !identity || identity.flat!==flat) return;
    const batch = queue.slice(0, 20); sending = true;
    try {
      const body=new URLSearchParams({payload:JSON.stringify({action:'gallery-site-events',token:identity.token,flat,sessionId,device,release,events:batch})});
      const result = await fetch(config.endpoint, { method: 'POST', body, cache:'no-store', keepalive: true, signal: AbortSignal.timeout(30000) });
      const data = await result.json(); if (result.ok && data.ok && Array.isArray(data.acknowledgedIds)) { const sent = new Set(data.acknowledgedIds.filter(id=>batch.some(event=>event.id===id))); queue = queue.filter(event => !sent.has(event.id)); }
    } catch (_) { /* Retry in-memory on the next interval; never save visit histories on a shared device. */ }
    finally { sending = false; }
  }
  flatInput.addEventListener('input', () => {
    flatInput.removeAttribute('aria-invalid');
    document.getElementById('residentGateStatus').textContent = '';
    document.getElementById('residentFlatPreview').textContent = ResidentAccess.parse(flatInput.value) || '';
  });
  gate.addEventListener('cancel', event => event.preventDefault());
  document.getElementById('residentLogin').onclick = () => {requestVersion++;gate.showModal();};
  const authEndpoint = () => window.SaiVistaGalleryConfig?.endpoint;
  async function authenticate(action, fields) {
    if(!authEndpoint())throw Error('Sign-in is being connected. Please try again shortly.');
    const body=new URLSearchParams({payload:JSON.stringify({action,...fields,requestId:crypto.randomUUID(),device})});
    const response=await fetch(authEndpoint(),{method:'POST',body,cache:'no-store',signal:AbortSignal.timeout(30000)});
    const result=await response.json();
    if(!response.ok||result.ok!==true)throw Error(result.error||'Sign-in is unavailable. Please try again.');
    return result;
  }
  function saveSession(result) {
    const resident=result.residentVerified===true;
    if((!resident&&(result.provider!=='clerk'||result.authenticated!==true))||(resident&&!ResidentAccess.parse(result.flat))||typeof result.flat!=='string'||(result.flat&&!ResidentAccess.parse(result.flat))||typeof result.token!=='string'||!result.token||typeof result.email!=='string'||!Number.isFinite(result.expires)||result.expires<=Date.now())throw Error('Verify your sign-in before continuing.');
    const saved={token:result.token,email:result.email,flat:result.flat,expires:result.expires,residentVerified:resident,...(result.provider==='clerk'?{provider:'clerk'}:{})};
    window.SaiVistaAuthSession=saved;window.SaiVistaResidentSession=resident?saved:null;
    try { storage.setItem('saiVistaResidentSession',JSON.stringify(saved)); if(resident)storage.setItem('saiVistaPrivateGallery',JSON.stringify(saved));else{storage.removeItem('saiVistaPrivateGallery');storage.removeItem('saiVistaResidentFlat');} } catch (_) { const notice=document.createElement('p');notice.setAttribute('role','status');notice.textContent='Verified for this visit. This browser cannot remember access; verification will be needed next time.';document.querySelector('footer').append(notice); }
    enter(result.flat,resident);
    document.getElementById('residentAccessBanner').hidden=false;document.getElementById('residentReviewCheck').hidden=!result.reviewPending;
    const notice=document.getElementById('residentAccessNotice');notice.textContent=resident?'Verified resident access. Only verified residents can view restricted data.':result.reviewPending?'Signed in. Resident verification is pending with Paresh. Only verified residents can view accounts, member payments, downloads and the photo gallery. Check verification here after approval.':'Signed in. Only verified residents can view accounts, member payments, downloads and the photo gallery. Residents can choose “Resident access” to request verification.';
  }
  document.getElementById('residentReviewCheck').onclick=async()=>{
    const identity=window.SaiVistaAuthSession,button=document.getElementById('residentReviewCheck');if(!identity)return;
    button.disabled=true;
    try{const result=await authenticate('gallery-resident-status',{token:identity.token,flat:identity.flat});saveSession({...result,token:identity.token});}catch(error){document.getElementById('residentAccessNotice').textContent=error.message;}finally{button.disabled=false;}
  };
  async function sendCode() {
    const value=ResidentAccess.parse(flatInput.value);
    if(!value){status.textContent='Enter your flat like A-101 or F-1304.';flatInput.focus();return;}
    if(!emailInput.reportValidity())return;
    if(Date.now()<retryAt){status.textContent='Wait 30 seconds before requesting another code.';return;}
    const version=++requestVersion;
    form.querySelector('button[type="submit"]').disabled=true;
    status.textContent='Checking your registered email and sending a code…';
    try {
      const result=await authenticate('gallery-resident-otp',{flat:value,email:emailInput.value.trim(),consent:true});
      if(version!==requestVersion)return;
      if(typeof result.challenge!=='string'||!result.challenge)throw Error('Resident verification is unavailable. Please try again.');
      pendingFlat=value;challenge=result.challenge;retryAt=Date.now()+30000;
      form.hidden=true;otpForm.hidden=false;status.textContent='Enter the six-digit code sent to your registered email. It expires in 10 minutes.';
      document.getElementById('residentCode').focus();
    } catch(error){if(version===requestVersion)status.textContent=error.message;}
    finally{form.querySelector('button[type="submit"]').disabled=false;}
  }
  async function socialLogin(value){
    if(value&&!ResidentAccess.parse(value)){status.textContent='Enter your flat like A-101 or F-1304, or leave it blank if you are not a resident.';flatInput.focus();return;}
    const version=++requestVersion;status.textContent='Connecting secure sign-in…';form.hidden=true;socialPanel.hidden=false;emailFallback.hidden=true;
    try{
      const clerkToken=await window.SaiVistaSocialAuth.start(value);
      if(version!==requestVersion)return;
      if(!clerkToken){status.textContent='Choose a sign-in account below.';return;}
      status.textContent='Checking your registered email and flat…';
      const result=await authenticate('gallery-resident-clerk',{flat:value,clerkToken,consent:true});
      if(version!==requestVersion)return;
      if(result.flat!==value||result.provider!=='clerk')throw Error('Verify your registered flat again.');
      window.SaiVistaSocialAuth.clear();socialPanel.hidden=true;form.hidden=false;
      if(new URLSearchParams(location.search).get('resident-sign-in')==='1')history.replaceState(null,'',location.pathname+location.hash);
      saveSession(result);
    }catch(error){if(version===requestVersion)status.textContent=error.message;}
  }
  form.addEventListener('submit',event=>{event.preventDefault();if(useSocial)socialLogin(flatInput.value.trim()?ResidentAccess.parse(flatInput.value)||'invalid':'');else sendCode();});
  document.getElementById('residentResend').onclick=sendCode;
  document.getElementById('residentOtherEmail').onclick=()=>{requestVersion++;form.hidden=false;otpForm.hidden=true;challenge='';status.textContent='';emailInput.focus();};
  otpForm.addEventListener('submit',async event=>{
    event.preventDefault();if(!otpForm.reportValidity())return;
    const version=++requestVersion,button=otpForm.querySelector('button[type="submit"]');button.disabled=true;status.textContent='Verifying your code…';
    try{const result=await authenticate('gallery-verify',{challenge,code:document.getElementById('residentCode').value,flat:pendingFlat});if(version===requestVersion){if(result.flat!==pendingFlat)throw Error('Verify your registered flat again.');saveSession(result);}}
    catch(error){if(version===requestVersion)status.textContent=error.message;}
    finally{button.disabled=false;}
  });
  function enter(value,resident=true) {
    status.textContent='';
    flat = value; window.SaiVistaGuest = !resident; document.documentElement.classList.toggle('guest-mode',!resident); if(resident)ResidentAccess.remember(storage, value); window.SaiVistaResidentReady = resident;
    document.documentElement.classList.remove('resident-locked'); gate.close();
    record('entry', 'site'); flush();
    // Log only meaningful named site sections, never form contents, captions or external URLs.
    const observed = new Set(), visible = new Set();
    activityObserver?.disconnect();clearInterval(activityTimer);
    const observer = activityObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);
      }
    }, { threshold: 0 });
    activityTimer=setInterval(() => {
      if (document.hidden || document.querySelector('dialog[open]')) return;
      for (const section of visible) {
        if (!observed.has(section.id) && !section.closest('[hidden]') && section.getClientRects().length) { observed.add(section.id); record('section', section.id); }
      }
    }, 1000);
    document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
    if(resident)window.dispatchEvent(new Event('sai-vista-resident-ready'));
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button[id], a[href^="#"]'); if (!target || !window.SaiVistaAuthSession || target.closest('#residentGate')) return;
    const id = target.id || target.getAttribute('href').slice(1);
    if (/^[A-Za-z][A-Za-z0-9-]{0,79}$/.test(id)) record('action', id);
  });
  window.addEventListener('hashchange', () => { const section = location.hash.slice(1); if (/^[A-Za-z][A-Za-z0-9-]{0,79}$/.test(section)) record('navigation', section); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  setInterval(flush, 10000);
  const change = document.createElement('button'); change.type = 'button'; change.textContent = 'Sign out / forget this device'; change.className = 'btn btn-outline';
  change.onclick = async () => {change.disabled=true;const identity=window.SaiVistaAuthSession;try{if(identity)await authenticate('gallery-logout',{token:identity.token,flat:identity.flat});}catch(_){/* Always forget this browser, even if the server is offline. */}finally{window.SaiVistaSocialAuth?.clear();try{await window.SaiVistaSocialAuth?.signOut();}catch(_){}try { storage.removeItem('saiVistaResidentSession'); storage.removeItem('saiVistaResidentFlat'); storage.removeItem('saiVistaPrivateGallery'); storage.removeItem('saiVistaGalleryCollection'); } catch (_) {} Promise.resolve(window.SaiVistaGalleryCache?.clear()).finally(()=>location.reload());}};
  document.querySelector('footer').append(change);
  document.addEventListener('click', event => {
    if (!window.SaiVistaGuest) return;
    const target = event.target.closest('[data-resident-only], #openPrivateGallery, [data-video-action="optimised"], [data-video-action="original"], a[href="#accounts"],a[href="#paymentDashboard"],a[href="#expenseDashboard"], a[href="#navratriPhotoGallery"], a[href="#communityPhotos"]');
    if (target) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  gate.showModal();
  let saved;
  try { saved=JSON.parse(storage.getItem('saiVistaResidentSession')||'null'); } catch (_) {}
  const socialFlat=window.SaiVistaSocialAuth?.pending();
  if(socialFlat!==null&&socialFlat!==undefined&&(socialFlat===''||ResidentAccess.parse(socialFlat))){flatInput.value=socialFlat;socialLogin(socialFlat);}
  else if(saved&&(ResidentAccess.parse(saved.flat)||(saved.provider==='clerk'&&saved.flat===''))&&typeof saved.token==='string'&&saved.expires>Date.now()){
    const version=requestVersion;status.textContent='Checking your remembered resident access…';
    authenticate('gallery-resident-status',{flat:saved.flat,token:saved.token}).then(result=>{
      if(version===requestVersion){if(result.flat!==saved.flat||result.email!==saved.email)throw Error('Verify your registered resident email again.');saveSession({...result,token:saved.token});}
    }).catch(error=>{if(version===requestVersion){status.textContent=error.message;try{storage.removeItem('saiVistaResidentSession');}catch(_) {}}});
  }
  window.addEventListener('sai-vista-private-signed-out',()=>{
    if(!window.SaiVistaAuthSession)return;
    activityObserver?.disconnect();clearInterval(activityTimer);
    requestVersion++;window.SaiVistaAuthSession=null;window.SaiVistaResidentSession=null;window.SaiVistaResidentReady=false;window.SaiVistaGuest=true;flat=null;queue=[];
    document.documentElement.classList.add('guest-mode');form.hidden=false;otpForm.hidden=true;challenge='';
    document.getElementById('residentCode').value='';
    try{storage.removeItem('saiVistaResidentSession');storage.removeItem('saiVistaResidentFlat');}catch(_){}
    gate.showModal();document.getElementById('residentAccessBanner').hidden=true;
  });
  window.addEventListener('storage',event=>{if(event.key===null||event.key==='saiVistaResidentSession'||event.key==='saiVistaResidentFlat')location.reload();});
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { if (gate.open && !flat) flatInput.focus(); }, 0));
})();
