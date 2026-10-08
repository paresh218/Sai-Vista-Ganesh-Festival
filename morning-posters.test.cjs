const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let now='2026-10-16T00:30:00Z',sent=[],props={},ok=true;
const c={Date:class extends Date{constructor(v){super(v===undefined?now:v)}},Utilities:{formatDate(d,t,f){const x=new Date(d.getTime()+19800000).toISOString();return f==='HH'?x.slice(11,13):x.slice(0,10)}},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k],setProperty:(k,v)=>props[k]=v})},UrlFetchApp:{fetch:()=>({getResponseCode:()=>ok?200:404,getBlob:()=>({getContentType:()=> 'image/png',setName(){}})})},MailApp:{sendEmail:m=>sent.push(m)}};
vm.createContext(c);vm.runInContext(fs.readFileSync('visitor-logs.gs','utf8'),c);
for(const d of ['2026-10-10T00:30:00Z','2026-10-22T00:30:00Z','2026-10-16T00:29:00Z']){now=d;c.sendMorningFestivalEmail()}assert.equal(sent.length,0);
now='2026-10-16T00:30:00Z';ok=false;assert.throws(()=>c.sendMorningFestivalEmail());assert.equal(props.MORNING_POSTER_SENT,undefined);ok=true;c.sendMorningFestivalEmail();assert.equal(sent.length,1);assert.ok(sent[0].body.includes('professional photographer'));assert.equal(sent[0].attachments.length,1);c.sendMorningFestivalEmail();assert.equal(sent.length,1);
now='2026-10-17T00:31:00Z';c.sendMorningFestivalEmail();assert.equal(sent.length,2);
for(let i=11;i<=21;i++)assert.ok(fs.existsSync('assets/daily-posters/2026-10-'+i+'.png'));
console.log('PASS: morning India-time window, festival boundaries, missing image retry, daily deduplication and all 11 posters');
