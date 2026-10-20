const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),vm=require('node:vm');
function service(){
 const sheets=new Map();let busy=false,flushFail=false;
 const book={getSheetByName:n=>sheets.get(n),insertSheet:n=>{const rows=[];const sheet={rows,getLastRow:()=>rows.length,appendRow:r=>rows.push(r),setFrozenRows(){},getRange:(r,c,n,w)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+w)),setFontWeight(){}})};sheets.set(n,sheet);return sheet;}};
 const ctx={PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'private-test-book'})},SpreadsheetApp:{openById:()=>book,flush(){if(flushFail)throw Error('uncertain save');}},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})},LockService:{getScriptLock:()=>({tryLock:()=>!busy,hasLock:()=>!busy,releaseLock(){}})}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('event-registration.gs','utf8'),ctx);
 return {ctx,sheets,post:d=>ctx.doPost({parameter:{payload:JSON.stringify(d)}}),setBusy:v=>busy=v,setFlushFail:v=>flushFail=v};
}
const good={action:'marathon-interest',requestId:'12345678-1234-1234-1234-123456789012',activity:'Running',name:'Test Resident',flat:'A-101',count:2,agreed:true};
test('private sheet routing, separate activities, duplicate protection and retry after uncertain save',()=>{
 const s=service();s.ctx.setupMarathonInterest();assert.deepEqual([...s.sheets.keys()],['Running','Walking']);
 assert.equal(s.post(good).status,'success');assert.equal(s.post(good).status,'success');assert.equal(s.sheets.get('Running').rows.length,2);
 assert.equal(s.post({...good,requestId:'12345678-1234-1234-1234-123456789013'}).status,'error');
 assert.equal(s.post({...good,count:3}).status,'error');
 assert.equal(s.post({...good,activity:'Walking'}).status,'success');assert.equal(s.sheets.get('Walking').rows.length,2);
 s.setFlushFail(true);const second={...good,flat:'B-102',requestId:'12345678-1234-1234-1234-123456789014'};assert.equal(s.post(second).status,'error');s.setFlushFail(false);assert.equal(s.post(second).status,'success');assert.equal(s.sheets.get('Running').rows.length,3);
});
test('server rejects invalid payloads and escapes spreadsheet formula input',()=>{
 const s=service();for(const patch of [{activity:'Other'},{requestId:'x'},{name:' '},{flat:'A-1401'},{flat:'G-101'},{count:0},{count:21},{count:1.5},{count:'2'},{agreed:false}])assert.equal(s.post({...good,...patch}).status,'error',JSON.stringify(patch));
 assert.equal(s.post({...good,name:'=IMPORTXML("x")'}).status,'success');assert.ok(s.sheets.get('Running').rows[1][2].startsWith("'="));
 s.setBusy(true);assert.equal(s.post({...good,flat:'C-101'}).status,'error');
});
