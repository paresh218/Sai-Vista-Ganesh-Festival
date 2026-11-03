const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
test('financial requests require a verified resident and carry credentials in the POST body only',async t=>{
  const w=new JSDOM('',{url:'https://example.test/',runScripts:'outside-only'}).window;t.after(()=>w.close());const calls=[];w.fetch=async(...args)=>{calls.push(args);return {ok:true};};w.eval(fs.readFileSync('finance-access.js','utf8'));
  for(const session of [undefined,{residentVerified:false,token:'public-token',flat:'A-101'}]){w.SaiVistaResidentSession=session;await assert.rejects(w.SaiVistaFinanceRequest('https://example.test/payments'));}assert.equal(calls.length,0);
  w.SaiVistaResidentSession={residentVerified:true,token:'private-token',flat:'A-101'};await w.SaiVistaFinanceRequest('https://example.test/payments');assert.equal(calls[0][0],'https://example.test/payments');const options=calls[0][1];assert.equal(options.method,'POST');assert.equal(options.cache,'no-store');assert.deepEqual(JSON.parse(options.body.get('payload')),{token:'private-token',flat:'A-101'});
});
test('private data services reject anonymous GET and POST requests before reading source data',()=>{
  for(const source of ['payments-source.gs','expense-source.gs','photo-gallery.gs']){
    let reads=0,requests=0,result={ok:true,residentVerified:false};const ctx={console:{error(){}},SpreadsheetApp:{openById:()=>{reads++;throw Error();},getActiveSpreadsheet:()=>{reads++;throw Error();}},UrlFetchApp:{fetch:(_url,options)=>{requests++;const data=JSON.parse(options.payload.payload);assert.equal(data.action,'gallery-finance-access');assert.equal(data.flat,'A-101');return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(result)};}},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('finance-access.gs','utf8')+'\n'+fs.readFileSync(source,'utf8'),ctx);
    const denied=ctx.doGet({parameter:{action:'payments'}});assert.equal(denied.status==='success'||denied.ok===true,false);assert.equal(reads,0);
    ctx.LockService={getScriptLock:()=>({hasLock:()=>false,releaseLock(){}})};
    const event=data=>({parameter:{action:source==='photo-gallery.gs'?'photos':undefined,payload:JSON.stringify(data)},postData:{contents:JSON.stringify(data)}});
    ctx.doPost(event({}));assert.equal(requests,0);ctx.doPost(event({token:'public-session',flat:'A-101'}));assert.equal(requests,1);assert.equal(reads,0);
    result={ok:true,residentVerified:true};assert.equal(ctx.financeResidentRequest(event({token:'resident-session',flat:'A-101'})).flat,'A-101');assert.equal(reads,0);
    assert.throws(()=>ctx.financeResidentRequest(event({token:'resident-session',flat:'../A-101'})));
    result={ok:false,residentVerified:true};assert.throws(()=>ctx.financeResidentRequest(event({token:'resident-session',flat:'A-101'})));
  }
});
