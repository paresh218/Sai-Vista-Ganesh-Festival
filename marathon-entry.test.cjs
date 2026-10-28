const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),{JSDOM}=require('jsdom');
const M=require('./marathon-model.js');
const good={action:'marathon-entry',requestId:'12345678-1234-1234-1234-123456789012',race:'3K',name:'Test Runner',dob:'2000-05-01',email:'runner@example.org',phone:'9876543210',emergencyName:'Emergency Contact',emergencyPhone:'9876543211',bloodGroup:'O+',shirt:'M',flat:'B-902',agreed:true,paymentToken:'a'.repeat(48)};
test('event fees, deadline in IST, age boundaries and guardian consent',()=>{
 assert.equal(M.validate(good,Date.parse('2026-11-26T23:59:59+05:30')),'');assert.match(M.validate(good,Date.parse(M.event.deadline)),/closed/);
 assert.equal(M.age('2014-11-29'),12);assert.equal(M.age('2014-11-30'),11);assert.equal(M.age('2014-02-30'),-1);
 for(const email of ['=formula@example.org','person@example.org,other','person@example.org\n','person@-invalid.org'])assert.ok(M.validate({...good,email}),email);
 for(const [key,value] of [['race','10K'],['dob','2015-01-01'],['email','invalid'],['phone','123'],['emergencyPhone',good.phone],['bloodGroup','Z+'],['shirt','XXXL'],['flat','Z-999'],['agreed',false]])assert.ok(M.validate({...good,[key]:value}),key);
 assert.match(M.validate({...good,dob:'2010-01-01'}),/guardian/);assert.equal(M.validate({...good,dob:'2010-01-01',guardian:'Test Parent',guardianConsent:true}),'');
});
function service(){
 const props=new Map(),rows=[],sent=[];let busy=false,mailFails=false;
 const sheet={getLastRow:()=>rows.length,appendRow:r=>rows.push(r),setFrozenRows:()=>{},getRange:(r,c,n=1,m=1)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+m)),setValue:v=>{rows[r-1][c-1]=v;},setValues:values=>{values.forEach((row,i)=>row.forEach((v,j)=>{rows[r-1+i][c-1+j]=v;}));}})};
 const ctx={console:{error:()=>{}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},Session:{getEffectiveUser:()=>({getEmail:()=> 'saivistaculturalcommittee@gmail.com'})},LockService:{getScriptLock:()=>({tryLock:()=>!busy,releaseLock:()=>{}})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>rows.length?sheet:null,insertSheet:()=>sheet}),flush:()=>{}},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()]},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})},MailApp:{getRemainingDailyQuota:()=>100,sendEmail:mail=>{if(mailFails)throw Error('quota');sent.push(mail);}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('marathon-model.js','utf8')+'\n'+fs.readFileSync('marathon-entry-service.gs','utf8'),ctx);
 const key='MARATHON_VERIFIED_'+crypto.createHash('sha256').update(good.paymentToken).digest('hex');
 const payment={status:'PAID',email:good.email,race:'3K',amountPaise:14900,currency:'INR',reference:'provider-test-1',expires:Date.now()+600000};
 return {ctx,rows,props,sent,key,payment,enable:()=>{props.set('MARATHON_PAYMENTS_ENABLED','true');props.set('MARATHON_SPREADSHEET_ID','private-test');props.set(key,JSON.stringify(payment));},busy:v=>busy=v,mailFails:v=>mailFails=v};
}
test('placeholder denies all entries including forged paid flag and returns no accepting readiness',()=>{
 const s=service();assert.equal(s.ctx.doGet().acceptingEntries,false);assert.throws(()=>s.ctx.marathonSaveEntry({...good,paid:true}),/pending/);assert.equal(s.rows.length,0);assert.equal(s.ctx.doPost({parameter:{payload:'{bad'}}).ok,false);
});
test('only matching authoritative payment works; amount, currency, expiry, ownership and reuse rejected',()=>{
 for(const change of [{amountPaise:19900},{currency:'USD'},{email:'other@example.org'},{race:'5K'},{expires:0},{usedBy:'other'},{status:'PENDING'}]){
  const s=service();s.enable();s.props.set(s.key,JSON.stringify({...s.payment,...change}));assert.throws(()=>s.ctx.marathonSaveEntry(good),/not verified/);assert.equal(s.rows.length,0);
 }
 const s=service();s.enable();s.props.delete(s.key);assert.throws(()=>s.ctx.marathonSaveEntry(good),/not verified/);
});
test('BIB allocation, exact retry, duplicate participant and payment reuse are protected',()=>{
 const s=service();s.enable();const result=s.ctx.marathonSaveEntry(good);assert.equal(result.bib,'SV26-3K-0001');assert.equal(result.emailStatus,'queued');assert.equal(s.rows.length,2);assert.equal(s.sent.length,0);
 assert.equal(s.ctx.marathonSaveEntry(good).bib,result.bib);assert.equal(s.rows.length,2);
 assert.throws(()=>s.ctx.marathonSaveEntry({...good,name:'Changed Name'}),/different entry/);
 assert.throws(()=>s.ctx.marathonSaveEntry({...good,requestId:'22345678-1234-1234-1234-123456789012'}),/not verified/);
 s.payment.reference='provider-test-2';s.props.set(s.key,JSON.stringify(s.payment));assert.throws(()=>s.ctx.marathonSaveEntry({...good,requestId:'22345678-1234-1234-1234-123456789012'}),/already has an entry/);
 const second=s.ctx.marathonSaveEntry({...good,requestId:'22345678-1234-1234-1234-123456789012',name:'Other Runner',dob:'1999-01-01'});assert.equal(second.bib,'SV26-3K-0002');
});
test('busy service does not append; queue retries mail failure and sends BIB without private emergency data',()=>{
 const s=service();s.enable();s.busy(true);assert.throws(()=>s.ctx.marathonSaveEntry(good),/busy/);assert.equal(s.rows.length,0);s.busy(false);s.ctx.marathonSaveEntry(good);
 s.mailFails(true);s.ctx.sendMarathonConfirmationEmails();assert.equal(s.rows[1][18],'QUEUED');s.mailFails(false);s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,1);assert.equal(s.rows[1][18],'SENT');assert.match(s.sent[0].body,/SV26-3K-0001/);assert.doesNotMatch(s.sent[0].body,/9876543211|O\+/);s.ctx.sendMarathonConfirmationEmails();assert.equal(s.sent.length,1);
});
test('wrong sender blocked, client fee ignored, formula input escaped, unknown blood group accepted',()=>{
 const s=service();s.enable();s.ctx.Session.getEffectiveUser=()=>({getEmail:()=> 'other@example.org'});assert.throws(()=>s.ctx.marathonSaveEntry(good),/Committee/);
 s.ctx.Session.getEffectiveUser=()=>({getEmail:()=> 'saivistaculturalcommittee@gmail.com'});s.ctx.marathonSaveEntry({...good,name:'=Test Runner',fee:1,bloodGroup:'Unknown'});assert.equal(s.rows[1][4],149);assert.equal(s.rows[1][5],"'=Test Runner");
});
function page(){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.org/',runScripts:'outside-only'}),w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};w.matchMedia=()=>({matches:true});
 w.ResidentAccess=require('./resident-access.js');w.eval(['marathon-model.js','marathon-registration-config.js','marathon-registration.js'].map(file=>fs.readFileSync(file,'utf8')).join('\n'));
 return dom;
}
test('form preview prefills flat, chooses distance, reveals guardian and never transmits or persists details',(t)=>{
 const dom=page(),w=dom.window,d=w.document;t.after(()=>w.close());w.localStorage.setItem('saiVistaResidentFlat','B-902');let requests=0;w.fetch=()=>{requests++;throw Error('must not send');};
 d.querySelector('[data-marathon-open="5K"]').click();const f=d.getElementById('marathonEntryForm');assert.equal(f.elements.flat.value,'B-902');assert.equal(f.elements.race.value,'5K');assert.match(d.getElementById('marathonEntryFee').textContent,/199/);assert.equal(d.getElementById('marathonEntrySubmit').disabled,true);
 f.elements.dob.value='2010-01-01';f.dispatchEvent(new w.Event('change'));assert.equal(d.getElementById('marathonGuardian').hidden,false);assert.equal(f.elements.guardian.required,true);
 f.elements.dob.value='2000-01-01';f.dispatchEvent(new w.Event('change'));assert.equal(d.getElementById('marathonGuardian').hidden,true);assert.equal(f.elements.guardian.required,false);
 d.getElementById('marathonEntrySubmit').disabled=false;f.dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(requests,0);assert.equal(w.localStorage.length,1);assert.match(d.getElementById('marathonEntryStatus').textContent,/No details have been submitted/);
 d.getElementById('marathonEntryClose').click();assert.equal(d.getElementById('marathonEntryDialog').open,false);assert.equal(d.activeElement.dataset.marathonOpen,'5K');assert.equal(f.elements.flat.value,'');w.close();
});
test('Motion uses local pinned runtime and reduced-motion; calendar uses correct UTC time',()=>{
 const html=fs.readFileSync('index.html','utf8');assert.match(html,/assets\/vendor\/motion-14\.7\.1\.js/);assert.match(fs.readFileSync('marathon-registration.js','utf8'),/prefers-reduced-motion: reduce/);assert.match(fs.readFileSync('assets/sai-vista-marathon-2026.ics','utf8'),/DTSTART:20261129T003000Z/);
});
