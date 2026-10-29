const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),{JSDOM}=require('jsdom');
const M=require('./marathon-model.js');
const bytes=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(24)]);
const good={action:'marathon-entry',requestId:'12345678-1234-1234-1234-123456789012',race:'3K',name:'Test Runner',dob:'2000-05-01',email:'runner@example.org',phone:'9876543210',emergencyName:'Emergency Contact',emergencyPhone:'9876543211',bloodGroup:'O+',shirt:'M',flat:'B-902',gender:'Female',medical:'Yes',medicalDetails:'Private note',agreed:true,paymentDeclared:true,paymentReference:'012345678901',proof:{type:'image/png',base64:bytes.toString('base64')}};
function service(){
 const props=new Map([['MARATHON_SPREADSHEET_ID','private-test'],['MARATHON_PROOF_FOLDER_ID','proof-test']]),rows=[],sent=[],files=[],cache=new Map();let busy=false,mailFails=false,quota=100,access='PRIVATE';
 const sheet={getName:()=> 'Marathon registrations 2026',getLastRow:()=>rows.length,appendRow:r=>rows.push(r),getRange:(r,c,n=1,m=1)=>({getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>rows[r-1+i]?.[c-1+j]??'')),setValue:v=>{rows[r-1][c-1]=v;},setValues:values=>values.forEach((row,i)=>row.forEach((v,j)=>{rows[r-1+i][c-1+j]=v;}))})};
 const ctx={console:{error:()=>{}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},Session:{getEffectiveUser:()=>({getEmail:()=> 'saivistaculturalcommittee@gmail.com'})},LockService:{getScriptLock:()=>({tryLock:()=>!busy,releaseLock:()=>{}})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush:()=>{}},DriveApp:{Access:{PRIVATE:'PRIVATE'},getFolderById:()=>({getSharingAccess:()=>access,createFile:blob=>{const f={blob,getUrl:()=> 'https://drive.google.com/private/test-'+files.length,setTrashed:v=>f.trashed=v};files.push(f);return f;}})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()],base64Decode:s=>[...Buffer.from(s,'base64')],newBlob:(b,t,n)=>({bytes:b,type:t,name:n})},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})},MailApp:{getRemainingDailyQuota:()=>quota,sendEmail:mail=>{if(mailFails)throw Error('mail interrupted');sent.push(mail);}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('marathon-model.js','utf8')+'\n'+fs.readFileSync('marathon-entry-service.gs','utf8'),ctx);rows.push(Array.from(vm.runInContext('MARATHON_COLUMNS',ctx)));
 return {ctx,rows,props,sent,files,sheet,enable:()=>props.set('MARATHON_REGISTRATION_ENABLED','true'),busy:v=>busy=v,mailFails:v=>mailFails=v,quota:v=>quota=v,access:v=>access=v};
}
test('10 November inclusive IST deadline, event-day age, gender, medical and guardian validation',()=>{
 assert.equal(M.validate(good,Date.parse('2026-11-10T23:59:59+05:30')),'');assert.match(M.validate(good,Date.parse('2026-11-11T00:00:00+05:30')),/closed on 10 November/);
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
 s.rows[1][20]='Yes';s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,1);assert.equal(s.rows[1][21],'SV26-3K-0001');assert.equal(s.rows[1][22],'SENT');assert.match(s.sent[0].body,/06:40 AM.*Race start/);assert.match(s.sent[0].body,/07:40 AM/);assert.doesNotMatch(s.sent[0].body,/Private note|9876543211|O\+|B-902/);
 s.ctx.sendMarathonConfirmationEmails();s.rows[1][20]='No';s.ctx.sendMarathonConfirmationEmails();s.rows[1][20]='Yes';s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,1);
});
test('quota defers; ambiguous email failure never auto-resends and retains BIB',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry(good);s.rows[1][20]='Yes';s.quota(0);s.ctx.sendMarathonConfirmationEmails();assert.equal(s.rows[1][21],'');assert.equal(s.sent.length,0);s.quota(100);s.mailFails(true);s.ctx.sendMarathonConfirmationEmails();assert.equal(s.rows[1][22],'REVIEW');const bib=s.rows[1][21];s.mailFails(false);s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,0);s.rows[1][22]='QUEUED';s.ctx.sendMarathonConfirmationEmails();assert.equal(s.rows[1][21],bib);assert.equal(s.sent.length,1);
});
test('multiple approved entries allocate unique BIBs, formula cells escaped, public actions cannot approve',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry({...good,name:'=Test Runner'});s.ctx.marathonSaveEntry({...good,requestId:'22345678-1234-1234-1234-123456789012',name:'Other Runner',email:'other@example.org',race:'5K',paymentReference:'123456789012'});assert.equal(s.rows[1][4],"'=Test Runner");s.rows[1][20]='Yes';s.rows[2][20]='Yes';s.ctx.sendMarathonConfirmationEmails();assert.equal(s.rows[1][21],'SV26-3K-0001');assert.equal(s.rows[2][21],'SV26-5K-0002');assert.equal(s.sent.length,2);assert.equal(s.ctx.doPost({parameter:{payload:JSON.stringify({action:'approve',requestId:good.requestId})}}).ok,false);
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
 d.querySelector('[data-marathon-open="3K"]').click();await new Promise(r=>setImmediate(r));const f=d.getElementById('marathonEntryForm');for(const key of ['name','dob','email','phone','emergencyName','emergencyPhone','bloodGroup','shirt','flat','gender','medical','paymentReference'])f.elements[key].value=good[key];f.elements.agreed.checked=true;f.elements.paymentDeclared.checked=true;Object.defineProperty(f.elements.paymentProof,'files',{value:[new w.File([bytes],'receipt.png',{type:'image/png'})]});f.reportValidity=()=>true; // JSDOM cannot populate a native file chooser's internal validity state.
 f.dispatchEvent(new w.Event('change'));assert.equal(d.getElementById('marathonEntrySubmit').disabled,false);
 f.dispatchEvent(new w.Event('submit',{cancelable:true}));for(let i=0;i<30&&!posted;i++)await new Promise(r=>setTimeout(r,10));assert.ok(posted.proof.base64);await new Promise(r=>setImmediate(r));assert.equal(d.getElementById('marathonEntrySuccess').hidden,false);assert.match(d.getElementById('marathonUpdatesGroup').href,/HhO4yXkBBb171GuQevJrmk/);assert.match(d.getElementById('marathonEntryStatus').textContent,/verify/);assert.equal(w.localStorage.length,0);
});
test('calendar begins at reporting time and no obsolete deadline appears in active marathon content',()=>{
 assert.match(fs.readFileSync('assets/sai-vista-marathon-2026.ics','utf8'),/DTSTART:20261129T001500Z/);for(const file of ['index.html','marathon-model.js','site-data.js','marathon-registration.js'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/26 November|26 NOVEMBER|2026-11-27/);assert.match(fs.readFileSync('marathon-registration.js','utf8'),/prefers-reduced-motion: reduce/);
});

test('network retry preserves request ID and evidence; group stays hidden until acknowledgement',async(t)=>{
 const dom=page(true),w=dom.window,d=w.document;t.after(()=>w.close());const posts=[];
 w.fetch=async(url,options={})=>{if(!options.method)return {json:async()=>({ok:true,service:'sai-vista-marathon-2026-manual-v1',acceptingEntries:true})};const payload=JSON.parse(options.body.get('payload'));posts.push(payload);if(posts.length===1)throw new w.TypeError('network interrupted');return {json:async()=>({ok:true,reference:payload.requestId,status:'pending-verification'})};};
 d.querySelector('[data-marathon-open="3K"]').click();await new Promise(r=>setImmediate(r));const f=d.getElementById('marathonEntryForm');
 for(const key of ['name','dob','email','phone','emergencyName','emergencyPhone','bloodGroup','shirt','flat','gender','medical','paymentReference'])f.elements[key].value=good[key];f.elements.agreed.checked=true;f.elements.paymentDeclared.checked=true;
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
test('sheet writes preserve leading-zero transaction references and literal dates',()=>{
 const s=service();s.enable();s.ctx.marathonSaveEntry(good);
 assert.equal(s.rows[1][18],"'"+good.paymentReference);assert.equal(s.rows[1][5],"'"+good.dob);
 s.rows[1][18]=s.rows[1][18].slice(1);s.rows[1][5]=s.rows[1][5].slice(1);s.rows[1][20]='Yes';
 s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,1);assert.equal(s.rows[1][22],'SENT');
});
