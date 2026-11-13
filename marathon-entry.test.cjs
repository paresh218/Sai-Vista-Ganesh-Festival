const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),{JSDOM}=require('jsdom');
const M=require('./marathon-model.js');
const bytes=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(24)]);
const good={action:'marathon-entry',requestId:'12345678-1234-1234-1234-123456789012',race:'3K',name:'Test Runner',bibName:'Runner',dob:'2000-05-01',email:'runner@example.org',phone:'9876543210',emergencyName:'Emergency Contact',emergencyPhone:'9876543211',bloodGroup:'O+',shirt:'M',flat:'B-902',gender:'Female',medical:'Yes',medicalDetails:'Private note',agreed:true,paymentDeclared:true,paymentReference:'012345678901',proof:{type:'image/png',base64:bytes.toString('base64')}};
function service(source=fs.readFileSync('marathon-entry-service.gs','utf8')){
 const props=new Map([['MARATHON_SPREADSHEET_ID','private-test'],['MARATHON_PROOF_FOLDER_ID','proof-test']]),rows=[],sent=[],files=[],cache=new Map();let busy=false,mailFails=false,quota=100,access='PRIVATE';
 const sheet={getMaxColumns:()=>rows[0]?.length||26,insertColumnsAfter:(_,n)=>{for(const row of rows)row.push(...Array(n).fill(''));},getName:()=> 'Marathon registrations 2026',getLastRow:()=>rows.length,appendRow:r=>rows.push(r),getRange:(r,c,n=1,m=1)=>({getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>rows[r-1+i]?.[c-1+j]??'')),setValue:v=>{rows[r-1][c-1]=v;},setValues:values=>values.forEach((row,i)=>row.forEach((v,j)=>{rows[r-1+i][c-1+j]=v;}))})};
 const ctx={console:{error:()=>{}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},Session:{getEffectiveUser:()=>({getEmail:()=> 'saivistaculturalcommittee@gmail.com'})},LockService:{getScriptLock:()=>({tryLock:()=>!busy,releaseLock:()=>{}})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush:()=>{}},DriveApp:{Access:{PRIVATE:'PRIVATE'},getFolderById:()=>({getSharingAccess:()=>access,createFile:blob=>{const f={blob,getUrl:()=> 'https://drive.google.com/private/test-'+files.length,setTrashed:v=>f.trashed=v};files.push(f);return f;}})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()],base64Decode:s=>[...Buffer.from(s,'base64')],newBlob:(b,t,n)=>({bytes:b,type:t,name:n})},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})},MailApp:{getRemainingDailyQuota:()=>quota,sendEmail:mail=>{if(mailFails)throw Error('mail interrupted');sent.push(mail);}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('marathon-model.js','utf8')+'\n'+source,ctx);rows.push(Array.from(vm.runInContext('MARATHON_COLUMNS',ctx)));
 return {ctx,rows,props,sent,files,sheet,enable:()=>props.set('MARATHON_REGISTRATION_ENABLED','true'),busy:v=>busy=v,mailFails:v=>mailFails=v,quota:v=>quota=v,access:v=>access=v};
}
test('14 November 5 PM IST deadline, event-day age, gender, medical and guardian validation',()=>{
 assert.equal(M.validate(good,Date.parse('2026-11-11T12:00:00+05:30')),'');assert.equal(M.validate(good,Date.parse('2026-11-14T16:59:59+05:30')),'');assert.match(M.validate(good,Date.parse('2026-11-14T17:00:00+05:30')),/closed on 14 November/);
 assert.equal(M.age('2014-11-29'),12);assert.equal(M.age('2014-11-30'),11);assert.equal(M.age('2014-02-30'),-1);
 for(const [key,value] of [['race','10K'],['dob','2015-01-01'],['email','bad'],['email','=bad@example.org'],['phone','123'],['emergencyPhone',good.phone],['bloodGroup','Z+'],['shirt','XXXL'],['flat','Z-999'],['gender',''],['medical',''],['medicalDetails','a'.repeat(501)],['agreed',false]])assert.ok(M.validate({...good,[key]:value}),key);
 assert.match(M.validate({...good,dob:'2010-01-01'}),/guardian/);assert.equal(M.validate({...good,dob:'2010-01-01',guardian:'Test Parent',guardianConsent:true}),'');
});
test('UPI link has exact payee, currency, race fee and schedule covers both flag-offs',()=>{
 const link=new URL(M.paymentLink('5K'));assert.equal(link.searchParams.get('pa'),'8149525915@ybl');assert.equal(link.searchParams.get('am'),'199');assert.equal(link.searchParams.get('cu'),'INR');assert.equal(M.schedule.length,7);assert.equal(M.schedule[3][0],'06:30 AM');assert.equal(M.schedule[4][0],'06:40 AM');
});
test('service fails closed until configured; forged paid and missing screenshot do not register',()=>{
 const s=service();assert.equal(s.ctx.doGet().acceptingEntries,false);assert.throws(()=>s.ctx.marathonSaveEntry({...good,paid:true}),/not open/);s.enable();
 for(const change of [{proof:null},{paymentDeclared:false},{paymentReference:'bad'},{proof:{type:'image/svg+xml',base64:good.proof.base64}},{proof:{type:'image/png',base64:Buffer.alloc(32).toString('base64')}},{proof:{type:'image/png',base64:'a'.repeat(4194308)}}])assert.throws(()=>s.ctx.marathonSaveEntry({...good,...change}));
 assert.equal(s.rows.length,1);assert.equal(s.files.length,0);assert.equal(s.ctx.doPost({parameter:{payload:'{bad'}}).ok,false);
});
test('pending entries privately save screenshot; fee is authoritative; exact retry never duplicates',()=>{
 const s=service();s.enable();const result=s.ctx.marathonSaveEntry({...good,fee:1,verified:true});assert.equal(result.status,'pending-verification');assert.equal(result.bib,undefined);assert.match(result.groupUrl,/chat.whatsapp.com/);assert.equal(s.rows.length,2);assert.equal(s.rows[1][3],149);assert.equal(s.rows[1][20],'');assert.equal(s.rows[1][21],'');assert.equal(s.sent.length,0);assert.equal(s.files.length,1);assert.equal(s.files[0].blob.name,good.requestId+'.png');
 s.ctx.marathonSaveEntry(good);assert.equal(s.rows.length,2);assert.equal(s.files.length,1);assert.throws(()=>s.ctx.marathonSaveEntry({...good,name:'Changed'}),/different details/);
 assert.throws(()=>s.ctx.marathonSaveEntry({...good,requestId:'22345678-1234-1234-1234-123456789012'}),/transaction reference/);
 assert.throws(()=>s.ctx.marathonSaveEntry({...good,requestId:'22345678-1234-1234-1234-123456789012',paymentReference:'123456789012'}),/already has an entry/);
});
test('lock, private-folder access and committee sender guards precede any data write',()=>{
 const s=service();s.enable();s.busy(true);assert.throws(()=>s.ctx.marathonSaveEntry(good),/busy/);s.busy(false);s.access('ANYONE');assert.throws(()=>s.ctx.marathonSaveEntry(good),/Private payment storage/);s.access('PRIVATE');s.ctx.Session.getEffectiveUser=()=>({getEmail:()=> 'other@example.org'});assert.throws(()=>s.ctx.marathonSaveEntry(good),/Committee/);assert.equal(s.rows.length,1);assert.equal(s.files.length,0);
});
test('only Yes approval sends a BIB once; schedule included, medical and emergency data excluded',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry(good);s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,0);s.rows[1][20]='No';s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,0);
 s.rows[1][20]='Yes';s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,1);assert.equal(s.rows[1][21],'3001');assert.equal(s.rows[1][22],'SENT');assert.match(s.sent[0].body,/06:40 AM.*Race start/);assert.match(s.sent[0].body,/07:40 AM/);assert.doesNotMatch(s.sent[0].body,/Private note|9876543211|O\+|B-902/);
 s.ctx.sendMarathonConfirmationEmails();s.rows[1][20]='No';s.ctx.sendMarathonConfirmationEmails();s.rows[1][20]='Yes';s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,1);
});

test('approved confirmation includes styled personalized HTML, poster, full schedule and safe action links',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry({...good,bibName:'<Runner & Co>'});s.rows[1][20]='Yes';s.ctx.sendMarathonConfirmationEmails();
 const mail=s.sent[0];assert.equal(mail.to,good.email);assert.match(mail.subject,/BIB 3001/);assert.ok(mail.body);assert.ok(mail.htmlBody);
 const dom=new JSDOM(mail.htmlBody);try{const d=dom.window.document;assert.match(d.body.textContent,/3001/);assert.match(d.body.textContent,/<Runner & Co>/);assert.equal(d.querySelectorAll('script,iframe').length,0);
 assert.ok(d.querySelector('meta[charset="UTF-8"]'));assert.ok(d.querySelector('img[alt]'));assert.equal(d.querySelectorAll('table[data-schedule] tbody tr').length,7);assert.match(d.body.textContent,/06:40 AM/);assert.match(d.body.textContent,/07:40 AM/);
 const links=[...d.querySelectorAll('a')];assert.ok(links.some(a=>a.href.endsWith('sai-vista-marathon-2026.ics')));assert.ok(links.some(a=>a.href.includes('chat.whatsapp.com/')));assert.ok(links.some(a=>a.href.startsWith('https://wa.me/')));
 const ack=links.find(a=>a.textContent.includes('Acknowledge'));assert.equal(new URL(ack.href).pathname,'saivistaculturalcommittee@gmail.com');assert.match(new URL(ack.href).searchParams.get('subject'),/3001/);
 assert.doesNotMatch(d.body.textContent,/Private note|9876543211|O\+|B-902|Register now|registration pending/);
 }finally{dom.window.close();}
 s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,1);
});
test('quota defers; ambiguous email failure never auto-resends and retains BIB',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry(good);s.rows[1][20]='Yes';s.quota(0);s.ctx.sendMarathonConfirmationEmails();assert.equal(s.rows[1][21],'');assert.equal(s.sent.length,0);s.quota(100);s.mailFails(true);s.ctx.sendMarathonConfirmationEmails();assert.equal(s.rows[1][22],'REVIEW');const bib=s.rows[1][21];s.mailFails(false);s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,0);s.rows[1][22]='QUEUED';s.ctx.sendMarathonConfirmationEmails();assert.equal(s.rows[1][21],bib);assert.equal(s.sent.length,1);
});
test('multiple approved entries allocate unique BIBs, formula cells escaped, public actions cannot approve',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry({...good,name:'=Test Runner'});s.ctx.marathonSaveEntry({...good,requestId:'22345678-1234-1234-1234-123456789012',name:'Other Runner',email:'other@example.org',race:'5K',paymentReference:'123456789012'});assert.equal(s.rows[1][4],"'=Test Runner");s.rows[1][20]='Yes';s.rows[2][20]='Yes';s.ctx.sendMarathonConfirmationEmails();assert.equal(s.rows[1][21],'3001');assert.equal(s.rows[2][21],'5001');assert.equal(s.sent.length,2);assert.equal(s.ctx.doPost({parameter:{payload:JSON.stringify({action:'approve',requestId:good.requestId})}}).ok,false);
});
function page(enabled=false){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.org/',runScripts:'outside-only'}),w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};w.matchMedia=()=>({matches:true});w.ResidentAccess=require('./resident-access.js');w.SaiVistaMarathonConfig={endpoint:'https://script.google.com/macros/s/test/exec',registrationEnabled:enabled};
 w.eval(fs.readFileSync('marathon-model.js','utf8')+'\n'+fs.readFileSync('marathon-registration.js','utf8'));return dom;
}
test('unconfigured form never transmits; screenshot and new fields required; no group before save',(t)=>{
 const dom=page(),w=dom.window,d=w.document;t.after(()=>w.close());let requests=0;w.fetch=()=>{requests++;throw Error('must not send');};w.localStorage.setItem('saiVistaResidentFlat','B-902');d.querySelector('[data-marathon-open="5K"]').click();const f=d.getElementById('marathonEntryForm');assert.equal(f.elements.flat.value,'B-902');assert.equal(f.elements.gender.required,true);assert.equal(f.elements.medical.required,true);assert.equal(f.elements.paymentProof.required,true);assert.equal(d.getElementById('marathonEntrySuccess').hidden,true);assert.equal(d.getElementById('marathonPayLink').hasAttribute('href'),false);
 f.elements.dob.value='2010-01-01';f.dispatchEvent(new w.Event('change'));assert.equal(f.elements.guardian.required,true);f.elements.medical.value='Yes';f.dispatchEvent(new w.Event('change'));assert.equal(d.getElementById('marathonMedicalNote').hidden,false);
 f.dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(requests,0);assert.match(d.getElementById('marathonEntryStatus').textContent,/No details have been submitted/);assert.equal(w.localStorage.length,1);assert.equal(d.querySelectorAll('#marathonScheduleRows tr').length,7);
});
test('configured browser saves only valid proof and shows pending status and group after acknowledged save',async(t)=>{
 const dom=page(true),w=dom.window,d=w.document;t.after(()=>w.close());let posted;w.fetch=async(url,options={})=>({json:async()=>{if(options.method==='POST'){posted=JSON.parse(options.body.get('payload'));return {ok:true,reference:posted.requestId,status:'pending-verification'};}return {ok:true,service:'sai-vista-marathon-2026-manual-v1',acceptingEntries:true};}});
 d.querySelector('[data-marathon-open="3K"]').click();await new Promise(r=>setImmediate(r));const f=d.getElementById('marathonEntryForm');for(const key of ['name','bibName','dob','email','phone','emergencyName','emergencyPhone','bloodGroup','shirt','flat','gender','medical'])f.elements[key].value=good[key];f.elements.medicalDetails.value=good.medicalDetails;f.elements.agreed.checked=true;f.elements.paymentDeclared.checked=true;Object.defineProperty(f.elements.paymentProof,'files',{value:[new w.File([bytes],'receipt.png',{type:'image/png'})]});f.reportValidity=()=>true; // JSDOM cannot populate a native file chooser's internal validity state.
 f.dispatchEvent(new w.Event('change'));assert.equal(d.getElementById('marathonEntrySubmit').disabled,false);
 f.dispatchEvent(new w.Event('submit',{cancelable:true}));for(let i=0;i<30&&!posted;i++)await new Promise(r=>setTimeout(r,10));assert.ok(posted.proof.base64);assert.equal(posted.bibName,good.bibName);await new Promise(r=>setImmediate(r));assert.equal(d.getElementById('marathonEntrySuccess').hidden,false);assert.match(d.getElementById('marathonUpdatesGroup').href,/HhO4yXkBBb171GuQevJrmk/);assert.match(d.getElementById('marathonEntryStatus').textContent,/verify/);assert.equal(w.localStorage.length,0);
});
test('calendar begins at reporting time and no obsolete deadline appears in active marathon content',()=>{
 assert.match(fs.readFileSync('assets/sai-vista-marathon-2026.ics','utf8'),/DTSTART:20261129T001500Z/);for(const file of ['index.html','marathon-model.js','site-data.js','marathon-registration.js'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/26 November|26 NOVEMBER|2026-11-27/);assert.match(fs.readFileSync('marathon-registration.js','utf8'),/prefers-reduced-motion: reduce/);
});

test('network retry preserves request ID and evidence; group stays hidden until acknowledgement',async(t)=>{
 const dom=page(true),w=dom.window,d=w.document;t.after(()=>w.close());const posts=[];
 w.fetch=async(url,options={})=>{if(!options.method)return {json:async()=>({ok:true,service:'sai-vista-marathon-2026-manual-v1',acceptingEntries:true})};const payload=JSON.parse(options.body.get('payload'));posts.push(payload);if(posts.length===1)throw new w.TypeError('network interrupted');return {json:async()=>({ok:true,reference:payload.requestId,status:'pending-verification'})};};
 d.querySelector('[data-marathon-open="3K"]').click();await new Promise(r=>setImmediate(r));const f=d.getElementById('marathonEntryForm');
 for(const key of ['name','bibName','dob','email','phone','emergencyName','emergencyPhone','bloodGroup','shirt','flat','gender','medical'])f.elements[key].value=good[key];f.elements.medicalDetails.value=good.medicalDetails;f.elements.agreed.checked=true;f.elements.paymentDeclared.checked=true;
 Object.defineProperty(f.elements.paymentProof,'files',{value:[new w.File([bytes],'receipt.png',{type:'image/png'})]});f.reportValidity=()=>true; // Native file validity is covered in the browser, not JSDOM.
 f.dispatchEvent(new w.Event('submit',{cancelable:true}));for(let i=0;i<30&&posts.length<1;i++)await new Promise(r=>setTimeout(r,10));await new Promise(r=>setImmediate(r));
 assert.equal(d.getElementById('marathonEntrySuccess').hidden,true);assert.match(d.getElementById('marathonEntryStatus').textContent,/do not pay again/);assert.equal(f.elements.name.value,good.name);
 f.dispatchEvent(new w.Event('submit',{cancelable:true}));for(let i=0;i<30&&posts.length<2;i++)await new Promise(r=>setTimeout(r,10));await new Promise(r=>setImmediate(r));
 assert.equal(posts[0].requestId,posts[1].requestId);assert.deepEqual(posts[0].proof,posts[1].proof);assert.equal(d.getElementById('marathonEntrySuccess').hidden,false);
});

test('approval edit trigger ignores unrelated columns, sheets and workbooks',()=>{
 const s=service();let calls=0;s.ctx.sendMarathonConfirmationEmails=()=>calls++;
 const event=(column,last=column,name='Marathon registrations 2026',id='private-test')=>({source:{getId:()=>id},range:{getColumn:()=>column,getLastColumn:()=>last,getSheet:()=>({getName:()=>name})}});
 s.ctx.marathonPaymentEdited(event(20));s.ctx.marathonPaymentEdited(event(22));s.ctx.marathonPaymentEdited(event(21,21,'Other'));s.ctx.marathonPaymentEdited(event(21,21,'Marathon registrations 2026','other'));assert.equal(calls,0);
 s.ctx.marathonPaymentEdited(event(21));s.ctx.marathonPaymentEdited(event(19,24));assert.equal(calls,2);
});

// Apps Script appendRow parses numeric-looking strings; force receipt references and DOB to text.
test('BIB print name is required, bounded, safely saved and included in email and retry identity',()=>{
 for(const bibName of [undefined,'','   ','x'.repeat(31),'Bad\nName'])assert.match(M.validate({...good,bibName}),/BIB/);
 const s=service();s.enable();s.ctx.marathonSaveEntry({...good,bibName:'=Runner'});
 assert.equal(s.rows[0][26],'Name on the BIB');assert.equal(s.rows[1][26],"'=Runner");
 assert.throws(()=>s.ctx.marathonSaveEntry({...good,bibName:'Other'}),/different details/);
 s.rows[1][20]='Yes';s.ctx.sendMarathonConfirmationEmails();assert.match(s.sent[0].body,/Name on the BIB: =Runner/);
 const dom=page();try{const field=dom.window.document.querySelector('[name="bibName"]');assert.equal(field.required,true);assert.equal(field.maxLength,30);assert.match(field.parentElement.textContent,/Name on the BIB/);}finally{dom.window.close();}
});

test('BIB counters are per distance, survive deleted rows, and never exceed four digits',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry(good);s.rows[1][20]='Yes';s.props.set('MARATHON_BIB_SEQUENCE_3K','3008');
 s.ctx.sendMarathonConfirmationEmails();assert.equal(s.rows[1][21],'3009');
 const full=service();full.enable();full.ctx.marathonSaveEntry(good);full.rows[1][20]='Yes';full.props.set('MARATHON_BIB_SEQUENCE_3K','3999');
 full.ctx.sendMarathonConfirmationEmails();assert.equal(full.rows[1][21],'');assert.equal(full.rows[1][22],'REVIEW');assert.equal(full.sent.length,0);
});

test('existing numeric BIBs prevent collisions; already issued legacy BIBs are preserved',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry(good);s.rows[1][20]='Yes';
 const older=[...s.rows[1]];older[0]='older';older[21]=3005;older[22]='SENT';s.rows.push(older);
 const legacy=[...older];legacy[0]='legacy';legacy[21]='SV26-3K-0001';s.rows.push(legacy);
 s.ctx.sendMarathonConfirmationEmails();assert.equal(s.rows[1][21],'3006');assert.equal(s.rows[3][21],'SV26-3K-0001');assert.equal(s.sent.length,1);
});

test('sheet upgrade appends BIB and accompaniment columns idempotently without moving approval or overwriting headers',()=>{
 const s=service();s.rows[0].splice(26);const before=[...s.rows[0]];
 s.ctx.marathonUpgradeBibNameColumn(s.sheet);assert.deepEqual(s.rows[0].slice(0,26),before);assert.equal(s.rows[0][26],'Name on the BIB');assert.equal(s.rows[0][20],'Payment verified?');
 s.ctx.marathonUpgradeBibNameColumn(s.sheet);assert.equal(s.rows[0].length,28);
 s.rows[0][26]='Other data';assert.throws(()=>s.ctx.marathonUpgradeBibNameColumn(s.sheet),/review/);assert.equal(s.rows[0][26],'Other data');
});

test('rollout accepts old sheet and cached form without losing a registration or retry',()=>{
 const s=service();s.enable();s.rows[0].pop();assert.equal(s.ctx.doGet().acceptingEntries,true);
 const oldForm={...good};delete oldForm.bibName;s.ctx.marathonSaveEntry(oldForm);
 assert.equal(s.rows[1][26],good.name);assert.equal(s.rows[0][26],'Name on the BIB');
 // A response lost before this release must still acknowledge its original reference.
 s.rows[1][26]='';
 const oldSource=fs.readFileSync('marathon-entry-service.gs','utf8').replace('bibName:d.bibName.trim(),','');
 const legacy=service(oldSource);legacy.enable();legacy.ctx.marathonSaveEntry({...good});
 s.rows[1][24]=legacy.rows[1][24];
 assert.equal(s.ctx.marathonSaveEntry({...good}).reference,good.requestId);assert.equal(s.rows.length,2);
 assert.throws(()=>s.ctx.marathonSaveEntry({...good,name:'Changed'}),/different details/);
});

test('sheet writes preserve leading-zero transaction references and literal dates',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry(good);
 assert.equal(s.rows[1][18],"'"+good.paymentReference);assert.equal(s.rows[1][5],"'"+good.dob);
 s.rows[1][18]=s.rows[1][18].slice(1);s.rows[1][5]=s.rows[1][5].slice(1);s.rows[1][20]='Yes';
 s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,1);assert.equal(s.rows[1][22],'SENT');
});

test('all displayed entry fields are required, labelled with stars, and conditional fields track visibility',t=>{
 const dom=page(),w=dom.window,d=w.document;t.after(()=>w.close());
 d.querySelector('[data-marathon-open="5K"]').click();const f=d.getElementById('marathonEntryForm');
 assert.match(d.querySelector('.marathon-required-note').textContent,/All shown fields are required/);
 const conditional=new Set(['guardian','guardianConsent','medicalDetails','parentAccompanied']);
 for(const input of f.querySelectorAll('input,select,textarea')){
   assert.equal(input.required,!conditional.has(input.name),input.name);
   assert.ok(input.closest('label').querySelector('.marathon-required'),input.name+' marker');
 }
 assert.equal(f.elements.flat.validity.valueMissing,true);
 f.elements.flat.value='Visitor';assert.equal(f.elements.flat.validity.valid,true);
 f.elements.dob.value='2010-01-01';f.elements.medical.value='Yes';f.dispatchEvent(new w.Event('change'));
 for(const key of ['guardian','guardianConsent','medicalDetails'])assert.equal(f.elements[key].required,true,key);assert.equal(f.elements.parentAccompanied.required,false);
 assert.equal(d.getElementById('marathonMedicalNote').hidden,false);
 f.elements.dob.value='2000-01-01';f.elements.medical.value='Prefer not to say';f.dispatchEvent(new w.Event('change'));
 for(const key of conditional)assert.equal(f.elements[key].required,false,key);
 assert.equal(d.getElementById('marathonMedicalNote').hidden,true);
});

test('shared/server validation rejects omitted flat and medical note while supporting visitors and privacy choice',()=>{
 for(const flat of ['',undefined,'NOT A FLAT'])assert.match(M.validate({...good,flat}),/flat/);
 for(const flat of ['VISITOR','Visitor','B-902'])assert.equal(M.validate({...good,flat}),'');
 for(const medicalDetails of ['',undefined,'   '])assert.match(M.validate({...good,medicalDetails}),/medical note/);
 for(const medical of ['No','Prefer not to say'])assert.equal(M.validate({...good,medical,medicalDetails:''}),'');
 const s=service();s.enable();assert.throws(()=>s.ctx.marathonSaveEntry({...good,flat:''}),/flat/);
 assert.throws(()=>s.ctx.marathonSaveEntry({...good,medicalDetails:''}),/medical note/);assert.equal(s.rows.length,1);assert.equal(s.files.length,0);
});


test('all ages accepted; ages 12 and under require parent accompaniment in browser and server',t=>{
 const child={...good,dob:'2018-05-01',guardian:'Test Parent',guardianConsent:true};
 assert.match(M.validate(child),/parent must accompany/);assert.equal(M.validate({...child,parentAccompanied:true}),'');
 assert.match(M.validate({...child,dob:'2014-11-29'}),/parent must accompany/);assert.equal(M.validate({...child,dob:'2013-11-29'}),'');
 assert.equal(M.validate({...good,dob:'1900-01-01'}),'');assert.match(M.validate({...good,dob:'2026-11-30'}),/date of birth/);
 const server=service();server.enable();assert.throws(()=>server.ctx.marathonSaveEntry(child),/parent must accompany/);assert.equal(server.rows.length,1);server.ctx.marathonSaveEntry({...child,parentAccompanied:true,paymentReference:''});assert.equal(server.rows[1][27],true);assert.equal(server.rows[1][18],'');
 const dom=page(),w=dom.window,d=w.document;t.after(()=>w.close());d.querySelector('[data-marathon-open="3K"]').click();const f=d.getElementById('marathonEntryForm');assert.equal(f.elements.paymentReference,undefined);assert.equal(f.elements.dob.min,'');assert.equal(f.elements.dob.max,'2026-11-29');
 f.elements.dob.value=child.dob;f.dispatchEvent(new w.Event('change'));assert.equal(d.getElementById('marathonParentAccompanied').hidden,false);assert.equal(f.elements.parentAccompanied.required,true);f.elements.parentAccompanied.checked=true;f.elements.dob.value=good.dob;f.dispatchEvent(new w.Event('change'));assert.equal(f.elements.parentAccompanied.required,false);assert.equal(f.elements.parentAccompanied.checked,false);
});
test('screenshot-only entries need no transaction reference and preserve duplicate participant protection',()=>{
 const s=service();s.enable();const first={...good};delete first.paymentReference;s.ctx.marathonSaveEntry(first);assert.equal(s.rows[1][18],'');assert.equal(s.ctx.marathonSaveEntry(first).reference,first.requestId);
 assert.throws(()=>s.ctx.marathonSaveEntry({...first,requestId:'22345678-1234-1234-1234-123456789012'}),/already has an entry/);
 s.ctx.marathonSaveEntry({...first,requestId:'22345678-1234-1234-1234-123456789012',name:'Second Runner',email:'second@example.org'});assert.equal(s.rows.length,3);assert.equal(s.sent.length,0);
});

test('saving blocks interaction through upload and response, prevents duplicate submit, then releases on success or failure',async t=>{
 for(const outcome of ['success','failure']){
  const dom=page(true),w=dom.window,d=w.document;t.after(()=>w.close());let finish,posted,posts=0;
  w.fetch=async(_url,options={})=>{if(!options.method)return {json:async()=>({ok:true,service:'sai-vista-marathon-2026-manual-v1',acceptingEntries:true})};posts++;posted=JSON.parse(options.body.get('payload'));return new Promise((resolve,reject)=>finish=()=>outcome==='success'?resolve({json:async()=>({ok:true,reference:posted.requestId,status:'pending-verification'})}):reject(new w.TypeError('offline')));};
  d.querySelector('[data-marathon-open="3K"]').click();await new Promise(r=>setImmediate(r));const f=d.getElementById('marathonEntryForm');
  for(const key of ['name','bibName','dob','email','phone','emergencyName','emergencyPhone','bloodGroup','shirt','flat','gender','medical'])f.elements[key].value=good[key];f.elements.medicalDetails.value=good.medicalDetails;f.elements.agreed.checked=true;f.elements.paymentDeclared.checked=true;
  Object.defineProperty(f.elements.paymentProof,'files',{value:[new w.File([bytes],'receipt.png',{type:'image/png'})]});f.reportValidity=()=>true;f.dispatchEvent(new w.Event('change'));f.dispatchEvent(new w.Event('submit',{cancelable:true}));
  const blocker=d.getElementById('marathonSaving');assert.equal(blocker.open,true);assert.equal(d.getElementById('marathonEntryClose').disabled,true);assert.equal(d.getElementById('marathonEntryDialog').getAttribute('aria-busy'),'true');
  const escape=new w.Event('cancel',{cancelable:true});blocker.dispatchEvent(escape);assert.equal(escape.defaultPrevented,true);f.dispatchEvent(new w.Event('submit',{cancelable:true}));
  for(let i=0;i<30&&!finish;i++)await new Promise(r=>setTimeout(r,10));assert.equal(posts,1);assert.equal(blocker.open,true);finish();for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));
  assert.equal(blocker.open,false);assert.equal(d.getElementById('marathonEntryClose').disabled,false);assert.equal(d.getElementById('marathonEntryDialog').hasAttribute('aria-busy'),false);
  if(outcome==='success'){assert.equal(d.activeElement,d.getElementById('marathonEntrySuccess'));assert.equal(f.hidden,true);}else{assert.equal(f.hidden,false);assert.equal(f.elements.name.value,good.name);assert.match(d.getElementById('marathonEntryStatus').textContent,/do not pay again/);}
 }
});

test('verified screenshot-only entries send confirmation once without a UTR, and historical reference formatting does not block approved entries',()=>{
 const s=service();s.enable();const entry={...good};delete entry.paymentReference;s.ctx.marathonSaveEntry(entry);s.rows[1][20]='Yes';s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,1);assert.equal(s.rows[1][22],'SENT');s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,1);
 const invalid=service();invalid.enable();invalid.ctx.marathonSaveEntry(entry);invalid.rows[1][18]='bad-reference';invalid.rows[1][20]='Yes';invalid.ctx.sendMarathonConfirmationEmails();assert.equal(invalid.rows[1][22],'SENT');assert.equal(invalid.sent.length,1);assert.equal(invalid.rows[1][18],'bad-reference');
});

test('backup UPI keeps the race fee, uses the approved ybl address and stays disabled until readiness',async t=>{
 for(const race of ['3K','5K']){
  const link=new URL(M.paymentLink(race,2));assert.equal(link.searchParams.get('pa'),'dashrathkale2261@ybl');assert.equal(link.searchParams.get('pn'),'DASHRATH DIGAMBAR KALE');assert.equal(link.searchParams.get('am'),String(M.event.fees[race]));assert.equal(link.searchParams.get('cu'),'INR');assert.equal(new URL(M.paymentLink(race)).searchParams.get('pa'),'8149525915@ybl');
 }
 const dom=page(true),w=dom.window,d=w.document;t.after(()=>w.close());let ready;
 w.fetch=()=>new Promise(resolve=>ready=()=>resolve({json:async()=>({ok:true,service:'sai-vista-marathon-2026-manual-v1',acceptingEntries:true})}));
 d.querySelector('[data-marathon-open="3K"]').click();const backup=d.getElementById('marathonPayBackupLink');assert.equal(backup.hasAttribute('href'),false);assert.equal(backup.getAttribute('aria-disabled'),'true');ready();await new Promise(r=>setImmediate(r));assert.equal(new URL(backup.href).searchParams.get('am'),'149');
 const form=d.getElementById('marathonEntryForm');form.elements.race.value='5K';form.dispatchEvent(new w.Event('change'));assert.equal(new URL(backup.href).searchParams.get('am'),'199');assert.equal(d.getElementById('marathonBackupFee').textContent,'5 km · ₹199');assert.equal(d.querySelector('.marathon-payment-help a').getAttribute('href'),'tel:+918149525915');assert.match(d.querySelector('.marathon-payment-backup summary').textContent,/Option 1 is not working/);assert.ok(fs.existsSync('assets/marathon-secondary-upi-qr.png'));
});


test('combined submitted count closes at exactly 200 and rejects further saves without losing idempotent retries',()=>{
 const s=service();s.enable();
 for(let i=0;i<199;i++){const row=Array(28).fill('');row[0]='existing-'+i;row[2]=i<120?'3K':'5K';row[6]='private@example.org';row[20]=i%2?'Yes':'';s.rows.push(row);}
 const before=s.ctx.doGet();assert.equal(before.acceptingEntries,true);assert.deepEqual(JSON.parse(JSON.stringify(before.counts)),{'3K':120,'5K':79,total:199,limit:200});assert.doesNotMatch(JSON.stringify(before),/private@example/);
 const entry={...good,paymentReference:''};assert.equal(s.ctx.marathonSaveEntry(entry).ok,true);
 const full=s.ctx.doGet();assert.equal(full.acceptingEntries,false);assert.equal(full.closedReason,'capacity');assert.equal(full.counts.total,200);assert.equal(full.counts['3K'],121);
 assert.equal(s.ctx.marathonSaveEntry(entry).ok,true);
 assert.throws(()=>s.ctx.marathonSaveEntry({...entry,requestId:'22345678-1234-1234-1234-123456789012',name:'Another Runner',email:'other@example.org',race:'5K'}),/all 200 participant places/);
 assert.equal(s.rows.length,201);assert.equal(s.files.length,1);
});

test('readiness counts only valid submitted race rows and closes at the IST deadline below capacity',()=>{
 const s=service();s.enable();s.rows.push(['','', '3K'],['invalid-race','','10K']);
 assert.equal(s.ctx.doGet().counts.total,0);
 vm.runInContext('Date.now=()=>Date.parse("2026-11-14T17:00:00+05:30")',s.ctx);
 const result=s.ctx.doGet();assert.equal(result.acceptingEntries,false);assert.equal(result.closedReason,'deadline');
});

test('public counters show each distance and a full-capacity response disables both UPI links',async t=>{
 const dom=page(true),w=dom.window,d=w.document;t.after(()=>w.close());
 w.fetch=async()=>({json:async()=>({ok:true,service:'sai-vista-marathon-2026-manual-v1',acceptingEntries:true,counts:{'3K':100,'5K':99,total:199,limit:200},closedReason:''})});
 d.querySelector('[data-marathon-open="3K"]').click();await new Promise(r=>setImmediate(r));
 assert.equal(d.querySelector('[data-marathon-count="3K"]').textContent,'100');assert.equal(d.querySelector('[data-marathon-count="5K"]').textContent,'99');assert.match(d.getElementById('marathonCountStatus').textContent,/199 of 200/);assert.equal(d.getElementById('marathonPayLink').hasAttribute('href'),true);
 d.getElementById('marathonEntryClose').click();w.fetch=async()=>({json:async()=>({ok:true,service:'sai-vista-marathon-2026-manual-v1',acceptingEntries:false,counts:{'3K':100,'5K':100,total:200,limit:200},closedReason:'capacity'})});
 d.querySelector('[data-marathon-open="5K"]').click();await new Promise(r=>setImmediate(r));
 assert.match(d.getElementById('marathonCapacityNotice').textContent,/all 200/);assert.equal(d.getElementById('marathonPayLink').hasAttribute('href'),false);assert.equal(d.getElementById('marathonPayBackupLink').hasAttribute('href'),false);assert.equal(d.getElementById('marathonEntrySubmit').disabled,true);
});

function accountAuth(s,email='runner@example.org'){
 s.ctx.UrlFetchApp={fetch:(_url,options)=>{const d=JSON.parse(options.payload.payload);assert.equal(d.action,'gallery-resident-status');assert.equal(d.token,'valid-session');return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({ok:true,email,flat:'B-902',residentVerified:true,expires:vm.runInContext('Date.now()',s.ctx)+60000})};}};
 return {token:'valid-session',flat:'B-902'};
}
test('private marathon entries use server-verified email, return own registration data and deny another account by reference',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry({...good});const family=[...s.rows[1]];family[0]='family-entry';family[4]='Family Runner';s.rows.push(family);const auth=accountAuth(s);
 const own=s.ctx.marathonAccountRequest({action:'marathon-my-entries',...auth});assert.equal(own.entries.length,2);assert.equal(own.entries[0].name,good.name);
 assert.deepEqual(Object.keys(own.entries[0]).sort(),['reference','name','race','bibName','shirt','bib','status','revision','details'].sort());assert.equal(own.entries[0].details.email,good.email);assert.equal(own.entries[0].details.medicalDetails,good.medicalDetails);assert.doesNotMatch(JSON.stringify(own),/private\/test|Payload digest/);
 accountAuth(s,'someoneelse@example.org');assert.equal(s.ctx.marathonAccountRequest({action:'marathon-my-entries',...auth}).entries.length,0);
 assert.throws(()=>s.ctx.marathonAccountRequest({action:'marathon-edit-entry',...auth,reference:good.requestId,bibName:'Stolen',shirt:'S',revision:own.entries[0].revision}),/not available/);
 assert.equal(s.rows[1][26],good.bibName);assert.equal(s.rows[1][10],good.shirt);
});
test('private marathon edits change only shirt and BIB name, reject other fields and stale concurrent saves',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry({...good});const auth=accountAuth(s),entry=s.ctx.marathonAccountRequest({action:'marathon-my-entries',...auth}).entries[0];const original=[...s.rows[1]];
 const request={action:'marathon-edit-entry',...auth,reference:good.requestId,revision:entry.revision,bibName:'New BIB Name',shirt:'XL'};
 for(const key of ['email','race','bib','fee','paymentVerified','name','dob'])assert.throws(()=>s.ctx.marathonAccountRequest({...request,[key]:'forged'}),/Only T-shirt/);
 const result=s.ctx.marathonAccountRequest(request);assert.equal(result.entry.bibName,'New BIB Name');assert.equal(result.entry.shirt,'XL');
 for(let i=0;i<original.length;i++)if(![10,26].includes(i))assert.deepEqual(s.rows[1][i],original[i]);
 assert.throws(()=>s.ctx.marathonAccountRequest(request),/entry changed/);
 assert.throws(()=>s.ctx.marathonAccountRequest({...request,revision:result.entry.revision,bibName:' '.repeat(4)}),/BIB name/);assert.throws(()=>s.ctx.marathonAccountRequest({...request,shirt:'XXXL'}),/valid T-shirt/);
});
test('private marathon account fails closed on forged, revoked, expired or mismatched sessions',()=>{
 const s=service();s.enable();const auth=accountAuth(s);
 assert.throws(()=>s.ctx.marathonAccountRequest({action:'marathon-my-entries',token:'forged',flat:auth.flat}));
 for(const response of [{ok:false},{ok:true,email:good.email,flat:'B-902',residentVerified:true,expires:Date.now()-1},{ok:true,email:good.email,flat:'A-101',residentVerified:true,expires:Date.now()+60000},{ok:true,email:good.email,flat:'B-902',residentVerified:false,expires:Date.now()+60000}]){
 s.ctx.UrlFetchApp={fetch:()=>({getResponseCode:()=>200,getContentText:()=>JSON.stringify(response)})};assert.throws(()=>s.ctx.marathonAccountRequest({action:'marathon-my-entries',...auth}),/sign in again/);
 }
 const response=s.ctx.doPost({parameter:{payload:JSON.stringify({action:'marathon-my-entries',...auth})}});assert.equal(response.ok,false);assert.equal(response.entries,undefined);
});
test('private entries grid clears immediately at sign-out and ignores a late response',async t=>{
 const dom=page(),w=dom.window,d=w.document;t.after(()=>w.close());let finish;
 w.SaiVistaAuthSession={token:'valid-session',flat:'B-902',expires:Date.now()+60000};w.fetch=()=>new Promise(resolve=>finish=()=>resolve({json:async()=>({ok:true,entries:[{reference:good.requestId,name:'Private Runner',race:'3K',bibName:'Runner',shirt:'M',status:'Awaiting payment verification',revision:'revision'}]})}));
 w.SaiVistaMarathon=M;w.eval(fs.readFileSync('marathon-account.js','utf8'));w.dispatchEvent(new w.Event('sai-vista-auth-cleared'));finish();await new Promise(r=>setImmediate(r));assert.equal(d.querySelectorAll('.marathon-my-entry').length,0);assert.match(d.getElementById('marathonMyEntriesStatus').textContent,/Sign in/);
});
test('multiple entries remain read-only until Edit, block duplicate saves, then show updated data or refreshed errors',async t=>{
 const dom=page(),w=dom.window,d=w.document;t.after(()=>w.close());const entries=[{reference:good.requestId,name:'Private Runner',race:'3K',bibName:'Runner',shirt:'M',status:'Awaiting payment verification',revision:'revision',details:{email:good.email,dob:good.dob}},{reference:'second-entry',name:'Family Runner',race:'5K',bibName:'Family',shirt:'S',status:'Payment verified',revision:'second'}];let posted,finish,posts=0;
 w.SaiVistaAuthSession={token:'valid-session',flat:'B-902',expires:Date.now()+60000};w.fetch=async(_url,options)=>{const payload=JSON.parse(options.body.get('payload'));if(payload.action==='marathon-edit-entry'){posted=payload;posts++;return new Promise(resolve=>finish=()=>resolve({json:async()=>({ok:true,entry:{...entries[0],bibName:payload.bibName,shirt:payload.shirt,revision:'updated'}})}));}return {json:async()=>({ok:true,entries})};};
 w.SaiVistaMarathon=M;w.eval(fs.readFileSync('marathon-account.js','utf8'));await new Promise(r=>setImmediate(r));assert.equal(d.querySelectorAll('.marathon-my-entry').length,2);assert.equal(d.querySelectorAll('#marathonMyEntriesGrid input, #marathonMyEntriesGrid select').length,0);
 d.querySelector('.marathon-my-entry button').click();const row=d.querySelector('.marathon-my-entry');assert.equal(row.querySelectorAll('input,select').length,2);row.querySelector('input').value='New Print';row.querySelector('select').value='L';row.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));row.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(posts,1);const blocker=d.getElementById('marathonAccountSaving');assert.equal(blocker.open,true);assert.equal(d.getElementById('marathonAccountSavingDone').hidden,true);const cancel=new w.Event('cancel',{cancelable:true});blocker.dispatchEvent(cancel);assert.equal(cancel.defaultPrevented,true);
 finish();await new Promise(r=>setImmediate(r));assert.deepEqual(Object.keys(posted).sort(),['action','reference','revision','bibName','shirt','token','flat'].sort());assert.equal(d.querySelectorAll('.marathon-my-entry').length,2);assert.equal(d.querySelector('.marathon-my-entry [data-label="Name on the BIB"]').textContent,'New Print');assert.equal(d.querySelector('.marathon-my-entry [data-label="T-shirt size"]').textContent,'L');assert.equal(d.querySelectorAll('#marathonMyEntriesGrid input').length,0);assert.equal(d.getElementById('marathonAccountSavingTitle').textContent,'Changes saved');assert.equal(d.getElementById('marathonAccountSavingDone').hidden,false);d.getElementById('marathonAccountSavingDone').click();assert.equal(blocker.open,false);
 w.fetch=async(_url,options)=>{const payload=JSON.parse(options.body.get('payload'));return {json:async()=>payload.action==='marathon-edit-entry'?{ok:false,error:'This entry changed.'}:{ok:true,entries:[{...entries[0],bibName:'Saved Elsewhere',shirt:'XL'},entries[1]]}};};d.querySelector('.marathon-my-entry button').click();d.querySelector('.marathon-my-entry form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setImmediate(r));assert.match(d.getElementById('marathonAccountSavingTitle').textContent,/Could not confirm/);assert.match(d.getElementById('marathonAccountSavingHelp').textContent,/latest saved data/);assert.equal(d.querySelector('.marathon-my-entry [data-label="Name on the BIB"]').textContent,'Saved Elsewhere');assert.equal(d.querySelector('.marathon-my-entry [data-label="T-shirt size"]').textContent,'XL');
});

test('participant edits close exactly at 5 PM IST while own entries remain viewable',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry({...good});const auth=accountAuth(s);let entry=s.ctx.marathonAccountRequest({action:'marathon-my-entries',...auth}).entries[0];
 vm.runInContext('Date.now=()=>Date.parse("2026-11-14T16:59:59+05:30")',s.ctx);
 const edit={action:'marathon-edit-entry',...auth,reference:good.requestId,revision:entry.revision,bibName:'Before cutoff',shirt:'L'};entry=s.ctx.marathonAccountRequest(edit).entry;assert.equal(entry.shirt,'L');
 const before=[...s.rows[1]];vm.runInContext('Date.now=()=>Date.parse("2026-11-14T17:00:00+05:30")',s.ctx);
 assert.throws(()=>s.ctx.marathonAccountRequest({...edit,revision:entry.revision,bibName:'Too late',shirt:'XL'}),/Editing closed/);assert.equal(JSON.stringify(s.rows[1]),JSON.stringify(before));assert.equal(s.ctx.marathonAccountRequest({action:'marathon-my-entries',...auth}).entries.length,1);assert.equal(s.ctx.doGet().acceptingEntries,false);
});
test('edit deadline is checked again after waiting for the script lock',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry({...good});const auth=accountAuth(s),entry=s.ctx.marathonAccountRequest({action:'marathon-my-entries',...auth}).entries[0],before=[...s.rows[1]];
 vm.runInContext('Date.now=()=>Date.parse("2026-11-14T16:59:59+05:30")',s.ctx);
 s.ctx.LockService={getScriptLock:()=>({tryLock:()=>{vm.runInContext('Date.now=()=>Date.parse("2026-11-14T17:00:00+05:30")',s.ctx);return true;},releaseLock:()=>{}})};
 assert.throws(()=>s.ctx.marathonAccountRequest({action:'marathon-edit-entry',...auth,reference:good.requestId,revision:entry.revision,bibName:'Too late',shirt:'XL'}),/Editing closed/);assert.equal(JSON.stringify(s.rows[1]),JSON.stringify(before));
});
test('an open edit becomes read-only at 5 PM and a stale save cannot send a request',async t=>{
 const dom=page(),w=dom.window,d=w.document;t.after(()=>w.close());let timer,posts=0;const nativeTimeout=w.setTimeout.bind(w);w.setTimeout=(fn,delay,...args)=>{if(delay===1000){timer=fn;return 1;}return nativeTimeout(fn,delay,...args);};w.Date.now=()=>Date.parse('2026-11-14T16:59:59+05:30');w.SaiVistaMarathon=M;w.SaiVistaAuthSession={token:'session',flat:'B-902',expires:Date.parse('2026-11-15T00:00:00+05:30')};
 w.fetch=async(_url,options)=>{const payload=JSON.parse(options.body.get('payload'));if(payload.action==='marathon-edit-entry')posts++;return {json:async()=>({ok:true,entries:[{reference:'own',name:'Own Runner',race:'3K',bibName:'Own',shirt:'M',status:'Payment verified',revision:'rev'}]})};};
 w.eval(fs.readFileSync('marathon-account.js','utf8'));await new Promise(r=>setImmediate(r));d.querySelector('.marathon-my-entry button').click();const stale=d.querySelector('.marathon-my-entry form');assert.ok(stale);w.Date.now=()=>Date.parse('2026-11-14T17:00:00+05:30');timer();assert.equal(d.querySelectorAll('.marathon-my-entry button,.marathon-my-entry input,.marathon-my-entry select').length,0);assert.equal(d.querySelectorAll('.marathon-my-entry').length,1);assert.match(d.getElementById('marathonEditDeadline').textContent,/read-only/);stale.dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(posts,0);
});


test('kids numeric shirt sizes use event-day under-16 boundary and reject arbitrary values',()=>{
 const child={...good,dob:'2012-05-01',guardian:'Parent',guardianConsent:true,shirt:'28'};
 assert.equal(M.validate(child,Date.parse('2026-11-13T12:00:00+05:30')),'');
 assert.equal(M.validate({...child,dob:'2010-11-30',shirt:'36'},Date.parse('2026-11-13T12:00:00+05:30')),'');
 for(const change of [{dob:'2010-11-29'},{shirt:'21'},{shirt:'38'},{shirt:28}])assert.match(M.validate({...child,...change},Date.parse('2026-11-13T12:00:00+05:30')),/T-shirt/);
 assert.equal(M.validate({...child,shirt:'M'},Date.parse('2026-11-13T12:00:00+05:30')),'');
});
test('server saves and edits kids numeric sizes but rejects adult numeric edits without writes',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry({...good,dob:'2012-05-01',guardian:'Parent',guardianConsent:true,shirt:'28'});
 const auth=accountAuth(s),entry=s.ctx.marathonAccountRequest({action:'marathon-my-entries',...auth}).entries[0];
 const edited=s.ctx.marathonAccountRequest({action:'marathon-edit-entry',...auth,reference:entry.reference,revision:entry.revision,bibName:entry.bibName,shirt:'30'});
 assert.equal(edited.entry.shirt,'30');assert.equal(s.rows[1][10],'30');
 const adult=service();adult.enable();adult.ctx.marathonSaveEntry({...good});const a=accountAuth(adult),e=adult.ctx.marathonAccountRequest({action:'marathon-my-entries',...a}).entries[0],before=JSON.stringify(adult.rows);
 assert.throws(()=>adult.ctx.marathonAccountRequest({action:'marathon-edit-entry',...a,reference:e.reference,revision:e.revision,bibName:e.bibName,shirt:'30'}),/participant age/);assert.equal(JSON.stringify(adult.rows),before);
});

test('registration switches between numeric kids sizes and adult sizes from DOB',t=>{const dom=page(),w=dom.window,d=w.document;t.after(()=>w.close());const f=d.getElementById('marathonEntryForm');f.elements.dob.value='2012-05-01';f.dispatchEvent(new w.Event('change'));assert.ok([...f.elements.shirt.options].some(o=>o.value==='28'));f.elements.shirt.value='28';f.elements.dob.value='1990-05-01';f.dispatchEvent(new w.Event('change'));assert.ok(![...f.elements.shirt.options].some(o=>o.value==='28'));assert.equal(f.elements.shirt.value,'');});
