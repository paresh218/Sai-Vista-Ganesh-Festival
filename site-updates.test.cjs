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

// Regression: stable release metadata and a cross-reload guard prevent loops.
async function pageTest({loaded='current',server='current',edited=false,storage=new Map(),blocked=false}={}) {
  const listeners={}; let reloads=0, notices=0;
  const doc={visibilityState:'visible',addEventListener:(type,fn)=>listeners[type]=fn,
    querySelector:selector=>selector.startsWith('meta')?{content:loaded}:null,
    body:{append(){notices++;}},createElement:()=>({setAttribute(){},style:{},append(){},addEventListener(){}})};
  const ctx={document:doc,location:{protocol:'https:',href:'https://example.test/index.html',origin:'https://example.test',reload(){reloads++;}},
    navigator:{onLine:true},window:{addEventListener(){}},URL,Date,AbortSignal,TextEncoder,crypto:require('node:crypto').webcrypto,
    sessionStorage:{getItem:key=>{if(blocked)throw Error('blocked');return storage.get(key);},setItem:(key,value)=>storage.set(key,value)},
    DOMParser:class{parseFromString(){return {querySelector:()=>({content:server}),querySelectorAll:()=>[]};}},
    fetch:async()=>({ok:true,text:async()=> 'unchanged raw server HTML'}),setInterval(){}};
  vm.runInNewContext(fs.readFileSync('site-updates.js','utf8'),ctx);
  if(edited) listeners.input({target:{closest:()=>true}});
  listeners.DOMContentLoaded();
  await new Promise(resolve=>setTimeout(resolve,30));
  listeners.visibilitychange();
  await new Promise(resolve=>setTimeout(resolve,30));
  return {reloads,notices};
}
(async()=>{
  assert.deepEqual(await pageTest(),{reloads:0,notices:0});
  const storage=new Map();
  assert.deepEqual(await pageTest({loaded:'old',storage}),{reloads:1,notices:0});
  assert.deepEqual(await pageTest({loaded:'old',storage}),{reloads:0,notices:1});
  assert.deepEqual(await pageTest({loaded:'old',edited:true}),{reloads:0,notices:1});
  assert.deepEqual(await pageTest({loaded:'old',blocked:true}),{reloads:0,notices:1});
  console.log('PASS: unchanged release stays stable; stale release reloads once across page loads; edited forms and unavailable storage never auto-reload.');
})().catch(error=>{console.error(error);process.exitCode=1;});
