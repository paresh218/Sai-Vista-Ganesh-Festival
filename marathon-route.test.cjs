const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup(reduce=false){
  const html=fs.readFileSync('index.html','utf8');
  const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
  let next=0,frames=new Map(),observer,change;
  w.matchMedia=()=>({matches:reduce,addEventListener:(type,fn)=>change=fn});
  w.requestAnimationFrame=fn=>{frames.set(++next,fn);return next;};
  w.cancelAnimationFrame=id=>frames.delete(id);
  w.IntersectionObserver=class{constructor(fn){observer=fn;}observe(){}};
  const path=w.document.querySelector('[data-route-path]');
  path.getTotalLength=()=>100;
  path.getPointAtLength=x=>({x,y:x});
  w.eval(fs.readFileSync('marathon-route.js','utf8'));
  const click=selector=>w.document.querySelector(selector).click();
  return {w,path,click,frames,show:()=>observer([{isIntersecting:true}]),hide:()=>observer([{isIntersecting:false}]),step:time=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));},reduce:()=>change()};
}
test('route uses latest original asset, offers image access without JavaScript and connects both turnarounds',()=>{
  const s=setup();
  assert.match(s.path.getAttribute('d'),/390 875/);
  assert.doesNotMatch(s.path.getAttribute('d'),/801 1310/);
  assert.ok(s.path.getAttribute('d').endsWith('266 290'));
  s.click('[data-route-race="5"]');
  assert.match(s.path.getAttribute('d'),/801 1310/);
  assert.ok(s.path.getAttribute('d').endsWith('266 290'));
  assert.equal(s.w.document.querySelector('[data-route-race="5"]').getAttribute('aria-pressed'),'true');
  const image=s.w.document.querySelector('.marathon-route-original img');
  assert.equal(image.getAttribute('src'),'assets/marathon-route-2026.jpeg');
  assert.ok(s.w.document.querySelector('#marathonRoute a[download]'));
  assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(image.getAttribute('src'))).digest('hex'),'d50ef91e565d289a734ca597875d67954313f2b28e551d3f094f629bc13a0daa');
  s.w.close();
});
test('route ends at Sai Vista and stops scheduling animation frames',()=>{
  const s=setup();s.show();
  for(let time=0;time<=15000;time+=100)s.step(time);
  assert.equal(s.path.style.strokeDashoffset,'0');
  assert.match(s.w.document.querySelector('[data-route-status]').textContent,/route complete/);
  assert.equal(s.frames.size,0);
  s.w.close();
});
test('route animation advances, pauses, replays and suspends outside the viewport',()=>{
  const s=setup();
  assert.equal(s.frames.size,0);
  s.show();s.step(0);s.step(100);
  assert.ok(Number(s.path.style.strokeDashoffset)<1);
  s.click('[data-route-play]');
  assert.equal(s.frames.size,0);
  assert.equal(s.w.document.querySelector('[data-route-play]').textContent,'Play animation');
  s.click('[data-route-replay]');
  assert.equal(s.path.style.strokeDashoffset,'1');
  assert.equal(s.frames.size,1);
  s.hide();assert.equal(s.frames.size,0);
  s.w.close();
});
test('reduced motion shows complete course without autoplay and permits intentional playback',()=>{
  const s=setup(true);s.show();
  assert.equal(s.frames.size,0);
  assert.equal(s.path.style.strokeDashoffset,'0');
  s.click('[data-route-play]');assert.equal(s.frames.size,1);
  s.reduce();assert.equal(s.frames.size,0);
  assert.equal(s.path.style.strokeDashoffset,'0');
  s.w.close();
});
