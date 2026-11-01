// Verified visit events use the resident/gallery service. The server supplies identity.
window.SaiVistaVisitConfig = {
  endpoint: 'https://script.google.com/macros/s/AKfycbxXf8vcp2d6xxsMx_11VM_7PRTNVNunsH8Eb9ArTFf_Fc3rQyH0KbMPY0IwDHnfmhtaeA/exec',
  capturesIp: false
};

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
  let challenge = '', pendingFlat = '', requestVersion = 0, retryAt = 0;
  let flat, queue = [], sending = false, activityObserver, activityTimer;
  const release=document.querySelector('meta[name="site-release"]').content;
  const sessionId = crypto.randomUUID();
  const device = { userAgent: navigator.userAgent.slice(0, 500), language: navigator.language, viewport: `${innerWidth}×${innerHeight}`, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  function record(type, target) {
    if (!flat || !config.endpoint) return;
    queue.push({ id: crypto.randomUUID(), type, target, clientTime: new Date().toISOString() });
    if (queue.length > 100) queue.shift();
    if (queue.length >= 10) flush();
  }
  async function flush() {
    const identity=window.SaiVistaResidentSession;
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
  document.getElementById('residentLogin').onclick = () => gate.showModal();
  document.getElementById('residentGuest').onclick = () => {
    requestVersion++; gate.close();
  };
  const authEndpoint = () => window.SaiVistaGalleryConfig?.endpoint;
  async function authenticate(action, fields) {
    if(!authEndpoint())throw Error('Resident verification is being connected. Please continue as guest for now.');
    const body=new URLSearchParams({payload:JSON.stringify({action,...fields,requestId:crypto.randomUUID(),device})});
    const response=await fetch(authEndpoint(),{method:'POST',body,cache:'no-store',signal:AbortSignal.timeout(30000)});
    const result=await response.json();
    if(!response.ok||result.ok!==true)throw Error(result.error||'Resident verification is unavailable. Please try again or continue as guest.');
    return result;
  }
  function saveSession(result) {
    if(result.residentVerified!==true||!ResidentAccess.parse(result.flat)||typeof result.token!=='string'||!result.token||typeof result.email!=='string'||!Number.isFinite(result.expires)||result.expires<=Date.now())throw Error('Verify your registered resident email before continuing.');
    const saved={token:result.token,email:result.email,flat:result.flat,expires:result.expires};
    window.SaiVistaResidentSession=saved;
    try { storage.setItem('saiVistaResidentSession',JSON.stringify(saved)); storage.setItem('saiVistaPrivateGallery',JSON.stringify(saved)); } catch (_) { const notice=document.createElement('p');notice.setAttribute('role','status');notice.textContent='Verified for this visit. This browser cannot remember access; verification will be needed next time.';document.querySelector('footer').append(notice); }
    enter(result.flat);
  }
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
  form.addEventListener('submit',event=>{event.preventDefault();sendCode();});
  document.getElementById('residentResend').onclick=sendCode;
  document.getElementById('residentOtherEmail').onclick=()=>{requestVersion++;form.hidden=false;otpForm.hidden=true;challenge='';status.textContent='';emailInput.focus();};
  otpForm.addEventListener('submit',async event=>{
    event.preventDefault();if(!otpForm.reportValidity())return;
    const version=++requestVersion,button=otpForm.querySelector('button[type="submit"]');button.disabled=true;status.textContent='Verifying your code…';
    try{const result=await authenticate('gallery-verify',{challenge,code:document.getElementById('residentCode').value,flat:pendingFlat});if(version===requestVersion){if(result.flat!==pendingFlat)throw Error('Verify your registered flat again.');saveSession(result);}}
    catch(error){if(version===requestVersion)status.textContent=error.message;}
    finally{button.disabled=false;}
  });
  function enter(value) {
    status.textContent='';
    flat = value; window.SaiVistaGuest = false; document.documentElement.classList.remove('guest-mode'); ResidentAccess.remember(storage, value); window.SaiVistaResidentReady = true;
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
    window.dispatchEvent(new Event('sai-vista-resident-ready'));
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button[id], a[href^="#"]'); if (!target || !flat || target.closest('#residentGate')) return;
    const id = target.id || target.getAttribute('href').slice(1);
    if (/^[A-Za-z][A-Za-z0-9-]{0,79}$/.test(id)) record('action', id);
  });
  window.addEventListener('hashchange', () => { const section = location.hash.slice(1); if (/^[A-Za-z][A-Za-z0-9-]{0,79}$/.test(section)) record('navigation', section); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  setInterval(flush, 10000);
  const change = document.createElement('button'); change.type = 'button'; change.textContent = 'Change flat / forget this device'; change.className = 'btn btn-outline';
  change.onclick = () => { try { storage.removeItem('saiVistaResidentSession'); storage.removeItem('saiVistaResidentFlat'); storage.removeItem('saiVistaPrivateGallery'); storage.removeItem('saiVistaGalleryCollection'); } catch (_) {} Promise.resolve(window.SaiVistaGalleryCache?.clear()).finally(()=>location.reload()); };
  document.querySelector('footer').append(change);
  document.addEventListener('click', event => {
    if (!window.SaiVistaGuest) return;
    const target = event.target.closest('[data-resident-only], #openPrivateGallery, [data-video-action="optimised"], [data-video-action="original"], a[href="#accounts"],a[href="#paymentDashboard"],a[href="#expenseDashboard"], a[href="#navratriPhotoGallery"], a[href="#communityPhotos"]');
    if (target) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  gate.showModal();
  let saved;
  try { saved=JSON.parse(storage.getItem('saiVistaResidentSession')||'null'); } catch (_) {}
  if(saved&&ResidentAccess.parse(saved.flat)&&typeof saved.token==='string'&&saved.expires>Date.now()){
    const version=requestVersion;status.textContent='Checking your remembered resident access…';
    authenticate('gallery-resident-status',{flat:saved.flat,token:saved.token}).then(result=>{
      if(version===requestVersion){if(result.flat!==saved.flat||result.email!==saved.email)throw Error('Verify your registered resident email again.');saveSession({...result,token:saved.token});}
    }).catch(error=>{if(version===requestVersion){status.textContent=error.message;try{storage.removeItem('saiVistaResidentSession');}catch(_) {}}});
  }
  window.addEventListener('sai-vista-private-signed-out',()=>{
    if(!window.SaiVistaResidentSession)return;
    activityObserver?.disconnect();clearInterval(activityTimer);
    requestVersion++;window.SaiVistaResidentSession=null;window.SaiVistaResidentReady=false;window.SaiVistaGuest=true;flat=null;queue=[];
    document.documentElement.classList.add('guest-mode');form.hidden=false;otpForm.hidden=true;challenge='';
    document.getElementById('residentCode').value='';
    try{storage.removeItem('saiVistaResidentSession');storage.removeItem('saiVistaResidentFlat');}catch(_){}
  });
  window.addEventListener('storage',event=>{if(event.key===null||event.key==='saiVistaResidentSession'||event.key==='saiVistaResidentFlat')location.reload();});
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { if (gate.open && !flat) flatInput.focus(); }, 0));
})();
