const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const loader=fs.readFileSync('marathon-3d.js','utf8');
function page({reduced=false,saveData=false,type='4g',memory=8,webgl=true,failure=false}={}){
 const dom=new JSDOM('<div><img alt="Marathon poster"><div id="marathon3d" aria-hidden="true"></div><button id="marathon3dPause" hidden>Pause motion</button></div>',{url:'https://example.org',runScripts:'outside-only'}),w=dom.window;
 let callback,imports=0,disposed=0,pauseValue;const changes=[];const motion={matches:reduced,addEventListener:(_,fn)=>changes.push(fn),removeEventListener:()=>{}};
 w.matchMedia=()=>motion;Object.defineProperty(w.navigator,'connection',{value:{saveData,effectiveType:type,addEventListener:()=>{},removeEventListener:()=>{}}});Object.defineProperty(w.navigator,'deviceMemory',{value:memory});if(webgl)w.WebGL2RenderingContext=function(){};
 w.IntersectionObserver=class{constructor(fn){callback=fn;}observe(){}disconnect(){}};
 w.loadScene=async()=>{imports++;if(failure)throw Error('offline');return {mountMarathonScene:(host,{onReady})=>{host.dataset.scene='ready';onReady();return {dispose:()=>disposed++,pause:v=>pauseValue=v};}};};
 w.console.warn=()=>{};w.eval(loader.replace("import('./assets/marathon-scene-v2.js')",'loadScene()'));
 return {w,dom,motion,imports:()=>imports,disposed:()=>disposed,pauseValue:()=>pauseValue,near:()=>callback([{isIntersecting:true}]),preference:()=>changes.forEach(fn=>fn())};
}
test('no 3D download for reduced motion, data saving, slow network, low memory or missing WebGL',async()=>{
 for(const options of [{reduced:true},{saveData:true},{type:'2g'},{type:'slow-2g'},{memory:2},{webgl:false}]){const p=page(options);await p.near();assert.equal(p.imports(),0);assert.equal(p.w.document.querySelector('img').getAttribute('aria-hidden'),null);assert.equal(p.w.document.querySelector('button').hidden,true);p.w.close();}
});
test('lazy scene loads once, toggles keyboard-accessible pause and restores poster on preference change',async()=>{
 const p=page(),d=p.w.document;assert.equal(p.imports(),0);await p.near();await p.near();assert.equal(p.imports(),1);assert.equal(d.querySelector('img').getAttribute('aria-hidden'),'true');assert.equal(d.querySelector('button').hidden,false);
 d.querySelector('button').click();assert.equal(p.pauseValue(),true);assert.equal(d.querySelector('button').getAttribute('aria-pressed'),'true');d.querySelector('button').click();assert.equal(p.pauseValue(),false);
 p.motion.matches=true;p.preference();assert.equal(p.disposed(),1);assert.equal(d.querySelector('img').getAttribute('aria-hidden'),null);assert.equal(d.querySelector('#marathon3d').dataset.scene,'fallback');p.w.close();
});
test('failed module and page exit keep poster and never claim active 3D',async()=>{
 const p=page({failure:true});await p.near();assert.equal(p.w.document.querySelector('button').hidden,true);assert.equal(p.w.document.querySelector('#marathon3d').dataset.scene,'fallback');p.w.close();
 const q=page();await q.near();q.w.dispatchEvent(new q.w.Event('pagehide'));assert.equal(q.disposed(),1);assert.equal(q.w.document.querySelector('#marathon3d').dataset.scene,'fallback');q.w.close();
});
test('four original adult runners wear jerseys; articulated motion and geometry stay finite',async()=>{
 const {buildMarathonScene}=await import('./tools/marathon-scene.mjs');const m=buildMarathonScene();assert.equal(m.runners.length,4);const shirts=[];let vertices=0;m.scene.traverse(o=>{if(o.name==='sai-vista-marathon-jersey')shirts.push(o);if(o.geometry){vertices+=o.geometry.attributes.position.count;for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}});assert.equal(shirts.length,4);assert.ok(vertices<80000);
 assert.ok(m.runners.some(r=>r.root.userData.appearance.glasses));assert.ok(m.runners.some(r=>r.root.userData.appearance.beard));assert.ok(m.runners.some(r=>r.root.userData.appearance.longHair));
 const before=m.runners[0].legs[0].rotation.x;m.update(.2);assert.notEqual(m.runners[0].legs[0].rotation.x,before);m.update(100000);assert.ok(m.scene.getObjectByName('running-shoe')===undefined);assert.ok(Number.isFinite(m.medal.rotation.y));m.dispose();assert.equal(m.scene.children.length,0);
});
test('society lawn replaces display shoe; balcony towers and flags form a coherent starting scene',async()=>{
 const {buildMarathonScene}=await import('./tools/marathon-scene.mjs'),m=buildMarathonScene();
 assert.equal(m.scene.getObjectByName('running-shoe'),undefined);assert.ok(m.scene.getObjectByName('society-lawn'));assert.ok(m.scene.getObjectByName('sai-vista-start-arch'));assert.ok(m.scene.getObjectByName('sai-vista-society'));
 const flags=[],towers=[];m.scene.traverse(o=>{if(o.name==='start-flag')flags.push(o);if(o.name==='balcony-tower')towers.push(o);});assert.equal(flags.length,2);assert.equal(towers.length,3);
 const fabric=flags[0].children.find(o=>o.geometry?.type==='PlaneGeometry'),before=Float32Array.from(fabric.geometry.attributes.position.array);m.update(.5);assert.notDeepEqual(fabric.geometry.attributes.position.array,before);for(const value of fabric.geometry.attributes.position.array)assert.ok(Number.isFinite(value));
 assert.ok(towers.every(t=>t.position.z<Math.min(...m.runners.map(r=>r.root.position.z))),'buildings remain behind the runners');m.dispose();
});
test('renderer lifecycle caps resolution and stops for hidden/offscreen/dialog/pause/context loss',async(t)=>{
 const THREE=await import('three'),dom=new JSDOM('<div id="host"></div><dialog></dialog>'),w=dom.window,d=w.document;t.after(()=>w.close());w.HTMLCanvasElement.prototype.getContext=()=>null;
 let renderCount=0,pixelRatio,now=0,hidden=false,disposed=0;const frames=new Map(),observers=[];let next=0;
 Object.defineProperty(d,'hidden',{get:()=>hidden});d.getElementById('host').getBoundingClientRect=()=>({width:390,height:440});
 const motion={matches:false,addEventListener(){},removeEventListener(){}};
 const ctx={THREE:{...THREE,WebGLRenderer:class{setPixelRatio(v){pixelRatio=v;}setSize(){}render(){renderCount++;}dispose(){disposed++;}}},document:d,navigator:{connection:{}},window:w,matchMedia:()=>motion,devicePixelRatio:3,innerWidth:390,performance:{now:()=>now},console,requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id),IntersectionObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){}},ResizeObserver:class{observe(){}disconnect(){}},MutationObserver:w.MutationObserver};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('tools/marathon-scene.mjs','utf8').replace("import * as THREE from 'three';",'').replaceAll('export function ','function '),ctx);
 let ready=false,failure=false;const host=d.getElementById('host'),control=ctx.mountMarathonScene(host,{onReady:()=>ready=true,onFailure:()=>failure=true});assert.ok(ready);assert.equal(pixelRatio,1.25);assert.equal(frames.size,0);
 observers[0].fn([{isIntersecting:true}]);assert.equal(frames.size,1);observers[0].fn([{isIntersecting:true}]);assert.equal(frames.size,1,'one loop only');
 const tick=delta=>{now+=delta;const todo=[...frames.values()];frames.clear();todo.forEach(fn=>fn(now));};const initial=renderCount;tick(10);assert.equal(renderCount,initial);tick(25);assert.equal(renderCount,initial+1);
 control.pause(true);assert.equal(frames.size,0);control.pause(false);assert.equal(frames.size,1);
 hidden=true;d.dispatchEvent(new w.Event('visibilitychange'));assert.equal(frames.size,0);hidden=false;d.dispatchEvent(new w.Event('visibilitychange'));assert.equal(frames.size,1);
 d.querySelector('dialog').setAttribute('open','');await new Promise(r=>setImmediate(r));assert.equal(frames.size,0);d.querySelector('dialog').removeAttribute('open');await new Promise(r=>setImmediate(r));assert.equal(frames.size,1);
 observers[0].fn([{isIntersecting:false}]);assert.equal(frames.size,0);observers[0].fn([{isIntersecting:true}]);host.querySelector('canvas').dispatchEvent(new w.Event('webglcontextlost',{cancelable:true}));assert.equal(frames.size,0);assert.equal(disposed,1);assert.ok(failure);assert.equal(host.querySelector('canvas'),null);control.dispose();assert.equal(disposed,1);
});
test('self-hosted bundle stays within gzip budget and is not in eager service-worker shell',()=>{
 const bytes=fs.readFileSync('assets/marathon-scene-v2.js'),z=require('node:zlib');assert.ok(z.gzipSync(bytes).length<200000);assert.doesNotMatch(fs.readFileSync('service-worker.js','utf8'),/"assets\/marathon-scene-v2.js"/);assert.match(fs.readFileSync('tools/marathon-scene.mjs','utf8'),/fillText\('SAI VISTA'/);
});
