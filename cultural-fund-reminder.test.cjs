const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
global.ResidentAccess=require('./resident-access.js');
const reminder=require('./cultural-fund-reminder.js');
const payload=paid=>({status:'success',payments:[{wing:'B',flat:'902',paid}]});
test('only an explicit, unique unpaid record triggers a reminder',()=>{
  for(const [value,status] of [['No','pending'],[' YES ','paid'],['','unknown'],['Pending','unknown']]) assert.equal(reminder.status(payload(value),'B-902'),status);
  for(const data of [null,{status:'error'},payload('No'),{status:'success',payments:[null]}, {status:'success',payments:[...payload('No').payments,...payload('Yes').payments]}]) {
    assert.equal(reminder.status(data,data===null?'B-902':'A-101'),'unknown');
  }
  assert.equal(reminder.status({status:'success',payments:[...payload('No').payments,...payload('Yes').payments]},'B-902'),'unknown');
});
function page(t,paid='No',setup=()=>{}) {
  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.org',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
  t.after(()=>w.close());let now=100000,calls=0,reply=payload(paid),fail=false;const timers=[];
  w.Date.now=()=>now;w.setInterval=(fn,ms)=>{const timer={fn,ms,active:true,interval:true};timers.push(timer);return timer;};w.setTimeout=(fn,ms)=>{const timer={fn,ms,active:true};timers.push(timer);return timer;};w.clearInterval=w.clearTimeout=timer=>{if(timer)timer.active=false;};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;this.querySelector('button')?.focus();};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  w.ResidentAccess=ResidentAccess;w.FestivalRegistration={collectionUrl:'https://example.org/payments'};w.SaiVistaResidentReady=true;w.localStorage.setItem('saiVistaResidentFlat','B-902');
  w.fetch=async(_url,options)=>{calls++;assert.equal(options.cache,'no-store');if(fail)throw Error('offline');return {ok:true,json:async()=>reply};};
  setup(w);w.eval(fs.readFileSync('cultural-fund-reminder.js','utf8'));
  const settle=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
  const run=async ms=>{for(const timer of timers.filter(x=>x.active&&x.ms===ms)){if(!timer.interval)timer.active=false;await timer.fn();}await settle();};
  return {w,d,dialog:d.getElementById('culturalFundReminder'),run,settle,calls:()=>calls,setReply:v=>reply=v,offline:()=>fail=true,advance:ms=>now+=ms};
}
test('unpaid resident gets an immediate login popup, 10-second reminders and eight-second close',async t=>{
  const p=page(t);await p.settle();assert.equal(p.dialog.open,true,'show immediately after login payment check');await p.run(8000);const trigger=p.d.getElementById('openPrivateGallery');trigger.focus();await p.run(10000);assert.equal(p.dialog.open,true);assert.match(p.d.getElementById('fundReminderCountdown').textContent,/8 seconds/);await p.run(1000);assert.match(p.d.getElementById('fundReminderCountdown').textContent,/7 seconds/);await p.run(8000);assert.equal(p.dialog.open,false);assert.equal(p.d.activeElement,trigger);
  await p.run(10000);assert.equal(p.dialog.open,true);p.d.getElementById('fundReminderClose').click();assert.equal(p.dialog.open,false);await p.run(8000);assert.equal(p.dialog.open,false);assert.equal(p.calls(),1);
});
test('paid, unknown and offline residents never get the popup',async t=>{
  for(const value of ['Yes','']){const p=page(t,value);await p.settle();await p.run(10000);assert.equal(p.dialog.open,false);}
  const p=page(t);await p.settle();await p.run(8000);p.offline();p.advance(60000);await p.run(10000);assert.equal(p.dialog.open,false);
});
test('payment refresh stops reminders; a changed flat never inherits unpaid status',async t=>{
  const p=page(t);await p.settle();await p.run(8000);p.setReply(payload('Yes'));p.advance(60000);await p.run(10000);assert.equal(p.dialog.open,false);assert.equal(p.calls(),2);
  p.w.localStorage.setItem('saiVistaResidentFlat','A-101');await p.run(10000);assert.equal(p.dialog.open,false);assert.equal(p.calls(),3);
});
test('gallery, forms and hidden tabs are not interrupted; hidden tabs close the popup',async t=>{
  const p=page(t);await p.settle();await p.run(8000);const gallery=p.d.getElementById('privateGallery');gallery.open=true;await p.run(10000);assert.equal(p.dialog.open,false);gallery.open=false;
  const form=p.d.getElementById('formModal');form.classList.remove('hidden');await p.run(10000);assert.equal(p.dialog.open,false);form.classList.add('hidden');
  await p.run(10000);assert.equal(p.dialog.open,true);Object.defineProperty(p.d,'hidden',{value:true,configurable:true});p.d.dispatchEvent(new p.w.Event('visibilitychange'));assert.equal(p.dialog.open,false);await p.run(10000);assert.equal(p.dialog.open,false);
});
test('removed programme is absent from the rendered site and archives',()=>{
  const html=fs.readFileSync('index.html','utf8');assert.doesNotMatch(html,/sund[ae]rkand/i);assert.doesNotMatch(fs.readFileSync('site-data.js','utf8'),/sund[ae]rkand/i);const d=new JSDOM(html).window.document;assert.equal(d.querySelectorAll('.kojagiri-programme').length,0);assert.doesNotMatch(html,/Kojagiri|2026-10-25|Puri, bhaji/i);assert.doesNotMatch(fs.readFileSync('site-data.js','utf8'),/Kojagiri|2026-10-25/i);
});
test('sound waits for interaction, lasts eight seconds and stops on mute, close or hiding',async t=>{
  const notes=[],parameter={setValueAtTime(){},exponentialRampToValueAtTime(){}};
  class Audio {
    constructor(){this.state='suspended';this.currentTime=10;this.destination={};}
    resume(){this.state='running';return Promise.resolve();}
    createOscillator(){const note={frequency:parameter,connect(){},disconnect(){},start:at=>note.startAt=at,stop:at=>{if(at===undefined)note.cancelled=true;else note.stopAt=at;}};notes.push(note);return note;}
    createGain(){return {gain:parameter,connect(){},disconnect(){}};}
  }
  const p=page(t,'No',w=>w.AudioContext=Audio);await p.settle();await p.run(10000);assert.equal(notes.length,0,'never bypass browser interaction requirement');await p.run(8000);
  p.d.dispatchEvent(new p.w.Event('pointerdown'));await p.settle();await p.run(10000);assert.equal(notes.length,16);assert.equal(notes[0].startAt,10);assert.equal(notes.at(-1).stopAt,18);
  const mute=p.d.getElementById('fundReminderSound');mute.click();assert.ok(notes.every(note=>note.cancelled));assert.equal(mute.getAttribute('aria-pressed'),'true');await p.run(8000);await p.run(10000);assert.equal(notes.length,16,'mute persists across reminders');
  mute.click();await p.settle();assert.equal(notes.length,32);p.d.getElementById('fundReminderClose').click();assert.ok(notes.every(note=>note.cancelled));
  await p.run(10000);assert.equal(notes.length,48);Object.defineProperty(p.d,'hidden',{value:true});p.d.dispatchEvent(new p.w.Event('visibilitychange'));assert.ok(notes.every(note=>note.cancelled));
  const login=page(t,'No',w=>{w.AudioContext=Audio;w.SaiVistaResidentReady=false;});login.d.dispatchEvent(new login.w.Event('pointerdown'));login.w.SaiVistaResidentReady=true;login.w.dispatchEvent(new login.w.Event('sai-vista-resident-ready'));await login.settle();assert.equal(login.dialog.open,true);assert.equal(notes.length,64,'login interaction unlocks sound for the immediate popup');
});
