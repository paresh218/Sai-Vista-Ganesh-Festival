const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const M=require('./event-registration-model.js');
const good={event:'drawing',requestId:'12345678-1234-1234-1234-123456789012',firstName:'Test',lastName:'Resident',wing:'A',flatNo:'101',phone:'9876543210',age:'12',agreed:true};
const config={drawingMaxAge:18};
assert.equal(M.validate(good,config),'');
for(const patch of [{age:19},{phone:'123'},{wing:'G'},{flatNo:'1401'},{agreed:false}])assert.ok(M.validate({...good,...patch},config));
assert.equal(M.validate({...good,age:18},config),'');assert.ok(M.validate({...good,age:17},{drawingMaxAge:16}));
const talent={...good,event:'talent',performanceType:'Solo',actType:'Singing',performanceTitle:'Festival song',durationSeconds:120};
assert.equal(M.validate(talent,config),'');assert.ok(M.validate({...talent,durationSeconds:121},config));
assert.equal(M.validate({...talent,performanceType:'Group',groupName:'Stars',durationSeconds:240},config),'');
assert.ok(M.validate({...talent,performanceType:'Group',groupName:'Stars',durationSeconds:241},config));
assert.ok(M.validate({...good,event:'prasad',adults:0,children:0},config));
const players=Array.from({length:5},(_,i)=>({firstName:['Test','Bina','Chetna','Deepa','Esha'][i],lastName:i===0?'Resident':'Test',phone:'9876543210'}));
assert.equal(M.validate({...good,event:'bollywood',players},config),'');assert.ok(M.validate({...good,event:'bollywood',players:players.slice(1)},config));
const sheets=new Map();
function sheet(){const rows=[];return {rows,getLastRow:()=>rows.length,appendRow:r=>rows.push(r),setFrozenRows(){},getRange:(start,col,count,width)=>({getValues:()=>rows.slice(start-1,start-1+count).map(r=>r.slice(col-1,col-1+width)),setFontWeight(){},setValue(v){rows[start-1][col-1]=v;}})};}
const book={getSheetByName:n=>sheets.get(n),insertSheet:n=>{const s=sheet();sheets.set(n,s);return s;}};
const props={SPREADSHEET_ID:'test'};
let fundPayload={status:"success",payments:[{wing:"A",flat:"101",paid:"Yes"}]};
let fundOffline=false;
const ctx={console,Map,Set,Date,UrlFetchApp:{fetch:()=>{if(fundOffline)throw Error("offline");return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(fundPayload)};}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]})},SpreadsheetApp:{openById:()=>book,flush(){}},LockService:{getScriptLock:()=>({tryLock:()=>true,waitLock(){},hasLock:()=>true,releaseLock(){}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('event-registration.gs','utf8'),ctx);
const post=d=>ctx.doPost({parameter:{payload:JSON.stringify(d)}});
ctx.setupEventRegistration();assert.equal(sheets.size,12);
assert.equal(post(good).status,'success');assert.equal(post(good).status,'success');assert.equal(sheets.get('Drawing').rows.length,2);
assert.equal(post({...good,age:13}).status,'error');
const next=(d,n)=>({...d,requestId:'12345678-1234-1234-1234-'+String(n).padStart(12,'0')});
assert.equal(post(next(good,2)).status,'error');
assert.equal(post(next(talent,3)).status,'success');assert.equal(post(next(talent,4)).status,'error');
assert.equal(post(next({...talent,performanceType:'Group',groupName:'Stars'},5)).status,'success');
assert.equal(post(next({...good,event:'bollywood',players},6)).status,'success');assert.equal(post(next({...good,event:'bollywood',players,firstName:'Other'},7)).status,'error');
assert.equal(post(next({...good,event:'fancy',costume:'Ganesha'},8)).status,'error');
props.FANCY_DRESS_DEADLINE='2020-09-21T17:00:00+05:30';assert.equal(post(next({...good,event:'fancy',costume:'Ganesha'},9)).status,'error');
props.FANCY_DRESS_DEADLINE='2099-09-21T17:00:00+05:30';assert.equal(post(next({...good,event:'fancy',costume:'Ganesha'},10)).status,'success');
for(const [id,extra] of Object.entries({treasure:{teamName:'Seekers'},rangoli:{},thali:{},funfair:{stallName:'Snacks',stallDetails:'Vegetarian snacks'},cooking:{age:18,dishName:'Salad',ingredients:'Vegetables'},pooja:{},prasad:{adults:2,children:1}}))assert.equal(post(next({...good,event:id,...extra},20+Object.keys(M.events).indexOf(id))).status,'success',id);
assert.equal(post(next({...good,event:'prasad',firstName:'Other',adults:1,children:0},40)).status,'error');
ctx.refreshChildrenGifts();assert.equal(sheets.get('Children Gifts').rows.length,2);sheets.get('Children Gifts').rows[1][6]='Yes';ctx.refreshChildrenGifts();assert.equal(sheets.get('Children Gifts').rows[1][6],'Yes');
assert.equal(ctx.cellSafe('=IMPORTXML("x")').startsWith("'"),true);
console.log('PASS: 11 event saves, validation, age limits, performance limits, wing/household duplicates, retries, deadlines, gift deduplication and issued flags, formula escaping.');

const countOnly={event:'prasad',requestId:'12345678-1234-1234-1234-999999999999',wing:'B',flatNo:'102',adults:2,children:0,agreed:true};
assert.equal(M.validate(countOnly,config),'');
assert.equal(post(countOnly).status,'success');
const countRow=sheets.get('Mahaprasad').rows.at(-1);
assert.equal(countRow[3],'');assert.equal(countRow[4],'');assert.equal(countRow[7],'');
assert.equal(post({...countOnly,requestId:'12345678-1234-1234-1234-999999999998'}).status,'error');
assert.ok(M.validate({...countOnly,event:'pooja'},config));
console.log('PASS: Mahaprasad saves without names/phone, retains household deduplication; other events still require names.');

assert.equal(M.culturalFundStatus({status:'success',payments:[{wing:' a ',flat:101,paid:' YES '}]},'A','101').paid,true);
for(const payments of [[],[{wing:'A',flat:'101',paid:'No'}],[{wing:'A',flat:'101',paid:true}],[{wing:'A',flat:'101',paid:'Yes'},{wing:'A',flat:'101',paid:'No'}]])assert.equal(M.culturalFundStatus({status:'success',payments},'A','101').paid,false);
const stall=next({...good,event:'funfair',wing:'B',firstName:'New',stallName:'Stall',stallDetails:'Food'},101);
const before=sheets.get('Fun n Fair').rows.length;
fundPayload={status:'success',payments:[{wing:'B',flat:'101',paid:'No'}]};
assert.match(post(stall).message,/pay the cultural fund first/);
assert.equal(sheets.get('Fun n Fair').rows.length,before);
fundPayload.payments[0].paid='Yes';assert.equal(post(stall).status,'success');
fundOffline=true;assert.equal(post(next({...stall,firstName:'Another'},102)).status,'error');
assert.equal(post(stall).status,'success'); // Saved retries do not create a new entry.
console.log('PASS: cultural fund paid/unpaid/missing/ambiguous checks, server-side enforcement, fresh paid update, outage blocks new entries, saved retry is safe.');

assert.match(M.validate({...good,event:'bollywood',players:players.map((p,i)=>i===0?{...p,phone:'9876543211'}:p)},config),/Player 1 must match/);

const cookingOnly=next({...good,event:'cooking'},999);
delete cookingOnly.age;
assert.equal(M.validate(cookingOnly,config),'');
assert.equal(post(cookingOnly).status,'error'); // Already registered participant.
cookingOnly.firstName='Fresh';
assert.equal(post(cookingOnly).status,'success');
assert.ok(M.validate({...cookingOnly,agreed:false},config));
console.log('PASS: cooking accepts no age/dish/ingredients; agreement remains required.');
for (const [index,event] of ['rangoli','thali'].entries()) {
  const entry=next({...good,event,firstName:'Ageless'},1100+index);
  delete entry.age;
  assert.equal(M.validate(entry,config),'');
  assert.equal(post(entry).status,'success');
  assert.equal(sheets.get(M.events[event].sheet).rows.at(-1)[8],'');
  assert.equal(sheets.get(M.events[event].sheet).rows.at(-1)[12],'');
}
console.log('PASS: Rangoli and Pooja Thali save without age or a children gift policy.');
const dashboardSource=fs.readFileSync('script.js','utf8').match(/PAYMENT_DASHBOARD_URL = "([^"]+)"/)[1];
assert.equal(M.collectionUrl,dashboardSource+'?action=payments');
assert.equal(vm.runInContext('FestivalRegistration.collectionUrl',ctx),M.collectionUrl);
const currentRegistration=fs.readFileSync('event-registration-config.js','utf8').match(/endpoint: "([^"]+)"/)[1];
assert.notEqual(M.collectionUrl.split('?')[0],currentRegistration);
assert.equal(M.culturalFundStatus({status:'success',service:'sai-vista-events-v1',config:{}},'A','102').paid,false);
console.log('PASS: browser and server use the collection endpoint, not the registration settings endpoint.');
