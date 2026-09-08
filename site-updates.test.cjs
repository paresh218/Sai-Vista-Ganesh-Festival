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
