const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const settle=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
function page(t,url='https://saivistaculturalcommittee.in/'){
  const w=new JSDOM(fs.readFileSync('index.html','utf8'),{url,runScripts:'outside-only'}).window;t.after(()=>w.close());
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.IntersectionObserver=class{observe(){}disconnect(){}};w.setInterval=()=>1;w.clearInterval=()=>{};
  w.SaiVistaVisitConfig={};w.SaiVistaGalleryConfig={endpoint:'https://example.test/auth'};w.SaiVistaSocialConfig={enabled:true,publishableKey:'pk_live_test',frontendApi:'https://clerk.saivistaculturalcommittee.in'};
  return w;
}
test('social login sends a provider token, never a claimed email; approved session opens resident access without OTP',async t=>{
  const w=page(t),calls=[];let cleared=0;
  w.SaiVistaSocialAuth={start:async flat=>{assert.equal(flat,'A-101');return 'signed-provider-token';},clear:()=>cleared++,pending:()=>null};
  w.fetch=async(url,options)=>{const d=JSON.parse(options.body.get('payload'));calls.push(d);assert.equal(d.action,'gallery-resident-clerk');assert.equal(d.clerkToken,'signed-provider-token');assert.equal('email' in d,false);assert.equal(d.consent,true);return {ok:true,json:async()=>({ok:true,residentVerified:true,provider:'clerk',token:'opaque-resident-session',flat:'A-101',email:'resident@example.com',expires:Date.now()+86400000})};};
  w.eval(fs.readFileSync('resident-access.js','utf8'));w.document.getElementById('residentFlat').value='A101';w.document.getElementById('residentGateForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();
  assert.equal(calls.length,1);assert.equal(w.SaiVistaGuest,false);assert.equal(w.document.getElementById('residentGate').open,false);assert.equal(w.SaiVistaResidentSession.provider,'clerk');assert.equal(cleared,1);assert.equal(w.document.getElementById('residentEmail').required,false);
});
test('changing login method cancels a pending social login; rejected access stays private and supports email fallback',async t=>{
  const w=page(t);let finish;w.SaiVistaSocialAuth={start:()=>new Promise(resolve=>finish=resolve),clear(){},pending:()=>null};let calls=0;w.fetch=async()=>{calls++;throw Error('Unexpected request');};
  w.eval(fs.readFileSync('resident-access.js','utf8'));w.document.getElementById('residentFlat').value='A-101';w.document.getElementById('residentGateForm').dispatchEvent(new w.Event('submit',{cancelable:true}));w.document.getElementById('residentEmailFallback').click();finish('provider-token');await settle();assert.equal(calls,0);assert.equal(w.SaiVistaGuest,true);
  w.document.getElementById('residentEmailFallback').click();assert.equal(w.document.getElementById('residentEmail').required,true);assert.equal(w.document.getElementById('residentEmailFields').hidden,false);
  const denied=page(t);denied.SaiVistaSocialAuth={start:async()=> 'token',clear(){},pending:()=>null};denied.fetch=async()=>({ok:true,json:async()=>({ok:false,error:'Not registered'})});denied.eval(fs.readFileSync('resident-access.js','utf8'));denied.document.getElementById('residentFlat').value='A-101';denied.document.getElementById('residentGateForm').dispatchEvent(new denied.Event('submit',{cancelable:true}));await settle();assert.equal(denied.SaiVistaGuest,true);assert.equal(denied.SaiVistaResidentSession,undefined);assert.equal(denied.document.getElementById('residentGateStatus').textContent,'Not registered');
});
test('Clerk SDK loads only on request, forces redirect and resumes only a recent same-browser flat continuation',async t=>{
  const w=page(t,'https://saivistaculturalcommittee.in/?resident-sign-in=1'),scripts=[],mounts=[];const append=w.document.head.append.bind(w.document.head);w.document.head.append=el=>{scripts.push(el.src);append(el);setImmediate(()=>el.onload());};
  w.Clerk={load:async()=>{},mountSignIn:(el,options)=>{assert.equal(options.routing,'hash');assert.equal(options.withSignUp,true);mounts.push({el,options});},unmountSignIn(){},signOut:async()=>{}};
  w.eval(fs.readFileSync('resident-social.js','utf8'));assert.equal(scripts.length,0);assert.equal(w.SaiVistaSocialAuth.pending(),null);assert.equal(await w.SaiVistaSocialAuth.start('A-101'),null);assert.equal(scripts.length,2);assert.ok(scripts.every(url=>url.startsWith('https://clerk.saivistaculturalcommittee.in/')));assert.equal(mounts[0].options.oauthFlow,'redirect');assert.equal(mounts[0].options.forceRedirectUrl,'https://saivistaculturalcommittee.in/?resident-sign-in=1');assert.equal(w.SaiVistaSocialAuth.pending(),'A-101');w.SaiVistaSocialAuth.clear();assert.equal(w.SaiVistaSocialAuth.pending(),null);
  w.sessionStorage.setItem('saiVistaSocialPending',JSON.stringify({flat:'A-101',expires:Date.now()-1}));assert.equal(w.SaiVistaSocialAuth.pending(),null);
});
test('signed-in public visitors need no flat and never receive resident or gallery access',async t=>{
  for(const flat of ['', 'A-101']){
    const w=page(t);w.SaiVistaSocialAuth={start:async chosen=>{assert.equal(chosen,flat);return 'provider-token';},clear(){},pending:()=>null};
    w.fetch=async(_url,options)=>{const d=JSON.parse(options.body.get('payload'));assert.equal(d.flat,flat);return {ok:true,json:async()=>({ok:true,authenticated:true,provider:'clerk',residentVerified:false,reviewPending:!!flat,token:'public-session',email:'visitor@example.com',flat,expires:Date.now()+86400000})};};
    w.eval(fs.readFileSync('resident-access.js','utf8'));w.document.getElementById('residentFlat').value=flat;w.document.getElementById('residentGateForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();assert.equal(w.document.getElementById('residentGate').open,false);assert.equal(w.SaiVistaGuest,true);assert.equal(w.SaiVistaResidentSession,null);assert.equal(w.SaiVistaResidentReady,false);assert.equal(w.SaiVistaAuthSession.token,'public-session');assert.equal(w.localStorage.getItem('saiVistaPrivateGallery'),null);assert.equal(w.document.getElementById('residentGuest'),null);assert.match(w.document.getElementById('residentAccessNotice').textContent,flat?/pending with Paresh/:/Only verified residents/);
  }
});
