const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const handlers = {};
let online = true, stored;
const cache = {match:async key=>key==='index.html'?new Response('offline page'):stored,put:async (_key,value)=>{stored=value;}};
const context={self:{location:{origin:'https://example.test'},addEventListener:(name,fn)=>handlers[name]=fn},caches:{open:async()=>cache},URL,Response,fetch:async()=>{if(!online)throw Error('offline');return new Response('fresh code');}};
vm.runInNewContext(fs.readFileSync('service-worker.js','utf8'),context);
async function request(mode='cors',cacheMode='default') {
 let result;const waits=[];
 handlers.fetch({request:{url:'https://example.test/script.js',method:'GET',mode,cache:cacheMode},respondWith:p=>result=p,waitUntil:p=>waits.push(p)});
 const response=await result;await Promise.all(waits);return response;
}
(async()=>{
 stored=new Response('old code');assert.equal(await (await request()).text(),'fresh code');
 online=false;assert.equal(await (await request()).text(),'fresh code');
 stored=undefined;assert.equal(await (await request('navigate')).text(),'offline page');
 assert.equal((await request()).type,'error');
 assert.equal(await request('cors','no-store'),undefined);
 console.log('PASS: fresh network response, offline cache, navigation fallback, no HTML for missing scripts, uncached update probes.');
})().catch(error=>{console.error(error);process.exitCode=1;});

// Regression: the first server probe must detect an already-stale displayed page.
async function stalePageTest(edited) {
  const listeners={}; let reloads=0, notices=0;
  const doc={visibilityState:'visible',documentElement:{outerHTML:'old page'},addEventListener:(type,fn)=>listeners[type]=fn,querySelector:()=>null,body:{append(){notices++;}},createElement:()=>({setAttribute(){},style:{},append(){},addEventListener(){}})};
  const ctx={document:doc,location:{protocol:'https:',href:'https://example.test/index.html',origin:'https://example.test',reload(){reloads++;}},navigator:{onLine:true},window:{addEventListener(){}},URL,Date,AbortSignal,DOMParser:class{parseFromString(html){return {documentElement:{outerHTML:html}};}},fetch:async()=>({ok:true,text:async()=> 'new page'}),setInterval(){}};
  vm.runInNewContext(fs.readFileSync('site-updates.js','utf8'),ctx);
  if(edited) listeners.input({target:{closest:()=>true}});
  listeners.DOMContentLoaded();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(reloads,edited?0:1);
  assert.equal(notices,edited?1:0);
}
(async()=>{await stalePageTest(false);await stalePageTest(true);console.log('PASS: stale first load refreshes; edited registration displays notice without losing data.');})().catch(error=>{console.error(error);process.exitCode=1;});
