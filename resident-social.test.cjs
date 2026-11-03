const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const settle=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
function page(t,url='https://saivistaculturalcommittee.in/'){
 const w=new JSDOM(fs.readFileSync('index.html','utf8'),{url,runScripts:'outside-only'}).window;t.after(()=>w.close());
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.IntersectionObserver=class{observe(){}disconnect(){}};w.setInterval=()=>1;w.clearInterval=()=>{};
 w.SaiVistaVisitConfig={};w.SaiVistaGalleryConfig={endpoint:'https://example.test/auth'};w.SaiVistaSocialConfig={enabled:true,publishableKey:'pk_live_test',frontendApi:'https://clerk.saivistaculturalcommittee.in'};
 w.SaiVistaSocialAuth={start:async()=> 'signed-provider-token',clear(){},pending:()=>null};return w;
}
const result=(flat,resident=true)=>({ok:true,authenticated:true,residentVerified:resident,provider:'clerk',token:'opaque-session',flat,email:'resident@example.com',expires:Date.now()+86400000});
test('Google comes first; a saved email/flat opens resident access without flat entry or OTP',async t=>{
 const w=page(t),calls=[];w.fetch=async(_url,options)=>{const d=JSON.parse(options.body.get('payload'));calls.push(d);assert.equal(d.flat,'');assert.equal(d.clerkToken,'signed-provider-token');assert.equal('email' in d,false);return {ok:true,json:async()=>result('A-101')};};
 w.eval(fs.readFileSync('resident-access.js','utf8'));await settle();assert.equal(calls.length,1);assert.equal(w.SaiVistaResidentSession.flat,'A-101');assert.equal(w.document.getElementById('residentGate').open,false);assert.equal(w.document.getElementById('residentFlatFields').hidden,true);assert.equal(w.document.getElementById('residentEmailFallback').hidden,true);assert.equal(w.document.getElementById('residentOtpForm').hidden,true);
});
test('new Google email asks for a flat once after authentication, saves it with the provider token and keeps unmatched data private',async t=>{
 const w=page(t),calls=[];w.fetch=async(_url,options)=>{const d=JSON.parse(options.body.get('payload'));calls.push(d);return {ok:true,json:async()=>calls.length===1?{ok:true,provider:'clerk',needsFlat:true,email:'resident@example.com'}:{...result('A-101',false),reviewPending:true}};};
 w.eval(fs.readFileSync('resident-access.js','utf8'));await settle();assert.equal(w.document.getElementById('residentFlatFields').hidden,false);assert.equal(w.document.getElementById('residentGate').open,true);assert.equal(w.SaiVistaResidentSession,undefined);assert.match(w.document.getElementById('residentGateStatus').textContent,/resident@example.com/);
 w.document.getElementById('residentFlat').value='A101';w.document.getElementById('residentGateForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();assert.equal(calls[1].flat,'A-101');assert.equal(calls[1].clerkToken,'signed-provider-token');assert.equal(w.SaiVistaResidentSession,null);assert.equal(w.document.getElementById('residentGate').open,false);assert.match(w.document.getElementById('residentAccessNotice').textContent,/pending with Paresh/);assert.equal(w.localStorage.getItem('saiVistaPrivateGallery'),null);
});
test('a new non-resident can choose public access without a flat; failed Google checks never open the site',async t=>{
 const w=page(t);let count=0;w.fetch=async(_url,options)=>{const d=JSON.parse(options.body.get('payload'));count++;if(count===2){assert.equal(d.publicVisitor,true);assert.equal(d.flat,'');}return {ok:true,json:async()=>count===1?{ok:true,provider:'clerk',needsFlat:true,email:'visitor@example.com'}:result('',false)};};
 w.eval(fs.readFileSync('resident-access.js','utf8'));await settle();w.document.getElementById('residentNonResident').click();await settle();assert.equal(w.SaiVistaResidentSession,null);assert.equal(w.SaiVistaAuthSession.flat,'');assert.equal(w.document.getElementById('residentGuest'),null);
 const denied=page(t);denied.fetch=async()=>({ok:true,json:async()=>({ok:false,error:'Sign-in expired'})});denied.eval(fs.readFileSync('resident-access.js','utf8'));await settle();assert.equal(denied.document.getElementById('residentGate').open,true);assert.equal(denied.SaiVistaResidentSession,undefined);assert.match(denied.document.getElementById('residentGateStatus').textContent,/Sign-in expired/);
});
test('Clerk loads only when started, uses hash routing and resumes only a recent same-browser continuation',async t=>{
 const w=page(t),scripts=[],mounts=[];const append=w.document.head.append.bind(w.document.head);w.document.head.append=el=>{scripts.push(el.src);append(el);setImmediate(()=>el.onload());};
 w.Clerk={load:async()=>{},mountSignIn:(el,options)=>mounts.push({el,options}),unmountSignIn(){},signOut:async()=>{}};
 w.eval(fs.readFileSync('resident-social.js','utf8'));assert.equal(scripts.length,0);assert.equal(await w.SaiVistaSocialAuth.start(''),null);assert.equal(scripts.length,2);assert.ok(scripts.every(url=>url.startsWith('https://clerk.saivistaculturalcommittee.in/')));assert.equal(mounts[0].options.routing,'hash');assert.equal(mounts[0].options.withSignUp,true);assert.equal(mounts[0].options.oauthFlow,'redirect');assert.equal(w.SaiVistaSocialAuth.pending(),'');w.SaiVistaSocialAuth.clear();assert.equal(w.SaiVistaSocialAuth.pending(),null);w.sessionStorage.setItem('saiVistaSocialPending',JSON.stringify({flat:'A-101',expires:Date.now()-1}));assert.equal(w.SaiVistaSocialAuth.pending(),null);
});

test('another email restores registered-email OTP and blocks repeated interaction while sending and validating',async t=>{
 const w=page(t);w.SaiVistaSocialAuth.start=async()=>null;let resolveRequest,calls=[];
 w.fetch=async(_url,options)=>{const d=JSON.parse(options.body.get('payload'));calls.push(d);return new Promise(resolve=>resolveRequest=data=>resolve({ok:true,json:async()=>data}));};
 w.eval(fs.readFileSync('resident-access.js','utf8'));await settle();assert.equal(w.document.getElementById('residentEmailFallback').hidden,false);w.document.getElementById('residentEmailFallback').click();
 assert.equal(w.document.getElementById('residentFlatFields').hidden,false);assert.equal(w.document.getElementById('residentEmailFields').hidden,false);assert.equal(w.document.getElementById('residentGoogleOption').hidden,false);
 w.document.getElementById('residentFlat').value='A101';w.document.getElementById('residentEmail').value='resident@outlook.com';w.document.getElementById('residentGateForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
 assert.equal(w.document.getElementById('residentValidation').open,true);assert.match(w.document.getElementById('residentValidationMessage').textContent,/Sending/);assert.equal(calls[0].email,'resident@outlook.com');assert.equal(calls[0].action,'gallery-resident-otp');
 const escape=new w.Event('cancel',{cancelable:true});w.document.getElementById('residentValidation').dispatchEvent(escape);assert.equal(escape.defaultPrevented,true);
 resolveRequest({ok:true,challenge:'otp-challenge'});await settle();assert.equal(w.document.getElementById('residentValidation').open,false);assert.equal(w.document.getElementById('residentOtpForm').hidden,false);
 w.document.getElementById('residentCode').value='123456';w.document.getElementById('residentOtpForm').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(w.document.getElementById('residentValidation').open,true);assert.match(w.document.getElementById('residentValidationMessage').textContent,/Validating/);resolveRequest({...result('A-101'),email:'resident@outlook.com'});await settle();assert.equal(w.document.getElementById('residentValidation').open,false);assert.equal(w.SaiVistaResidentSession.email,'resident@outlook.com');
});
test('failed or offline login closes the blocker and keeps protected access closed',async t=>{
 const w=page(t);let fail;w.fetch=()=>new Promise((_resolve,reject)=>fail=reject);w.eval(fs.readFileSync('resident-access.js','utf8'));await settle();assert.equal(w.document.getElementById('residentValidation').open,true);fail(Error('Connection unavailable'));await settle();assert.equal(w.document.getElementById('residentValidation').open,false);assert.equal(w.document.getElementById('residentGate').open,true);assert.equal(w.SaiVistaResidentSession,undefined);assert.match(w.document.getElementById('residentGateStatus').textContent,/Connection unavailable/);
});
