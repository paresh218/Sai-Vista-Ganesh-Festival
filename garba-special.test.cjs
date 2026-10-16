const {readFileSync}=require('node:fs'),{runInNewContext}=require('node:vm'),assert=require('node:assert/strict');
class El{
 constructor(tag){this.tag=tag;this.children=[];this.value='';this.hidden=false;}
 append(...els){this.children.push(...els);els.forEach(e=>e.parentNode=this);}
 after(el){this.parentNode.append(el);}before(el){this.parentNode.append(el);}
 closest(){return null;}setAttribute(k,v){this[k]=v;}replaceChildren(){this.children=[];}
}
const root=new El('root'),toolbar=new El('div'),day=new El('select'),search=new El('input');root.append(toolbar,day);toolbar.append(search);
const handlers={};const events={},catalogue=JSON.parse(readFileSync('garba-catalogue.json','utf8'));let options,paused=0,cancelled=0,stopped=0,onlinePaused=0,opened=0,imports=0,localPlays=0,loaded=[];
const window={addEventListener:(name,fn)=>events[name]=fn,SaiVistaStudioBridge:{dj:{pause:()=>paused++,cancelSwitch:()=>cancelled++},openGarba:()=>opened++,importGarba:async()=>{imports++;return{id:"local_garba"};},getGarbaSong:id=>id==="local_garba",playGarba:async()=>localPlays++}};
window.YT={Player:class{constructor(id,o){options=o;this.loadVideoById=id=>loaded.push(id);this.stopVideo=()=>stopped++;this.pauseVideo=()=>onlinePaused++;this.playVideo=()=>loaded.push("resume");}}};
const context={localStorage:{getItem:()=>null,setItem(){}},window,document:{createElement:tag=>new El(tag),getElementById:id=>id==='songDay'?day:search,head:new El('head')},navigator:{mediaSession:{setActionHandler:(name,fn)=>handlers[name]=fn},onLine:true,storage:{persist:async()=>true}},fetch:async()=>({ok:true,json:async()=>catalogue}),setTimeout,clearTimeout,Math,Promise,Error};
runInNewContext(readFileSync('garba-special.js','utf8'),context);
(async()=>{
 const launch=root.children.find(e=>e.textContent==='Garba Special ♫');assert.ok(launch);
 await launch.onclick();const panel=root.children.find(e=>e.tag==='section');assert.equal(panel.hidden,false);
 const [heading,note,category,query,video,controls,status,list,label,help,local]=panel.children;
 assert.equal(category.children.length,8);assert.equal(list.children.length,16);assert.ok(list.children.every(row=>row.children.every(el=>el.tag!=='a')),'Song rows must contain no external video links');
 await list.children[0].children[0].onclick();assert.equal(paused,1);assert.equal(cancelled,1);assert.equal(video.hidden,false);
 assert.equal(options.width,'200','Provider requires a 200px embedded viewport');assert.equal(video['aria-hidden'],'true');assert.ok(video.className.includes('garba-audio-only'));assert.ok(!note.textContent.includes('PYC'));
 options.events.onReady({target:{loadVideoById:id=>loaded.push(id)}});loaded=[];options.events.onStateChange({data:0});await new Promise(resolve=>setImmediate(resolve));assert.equal(loaded[0],catalogue.slots.prachin[1].id,'Ended song advances automatically');
 handlers.pause();assert.equal(onlinePaused,1,'Background pause controls target Garba playback');handlers.play();assert.equal(loaded.at(-1),'resume');events['sai-vista-dj-play']();assert.equal(onlinePaused,2,'Starting DJ audio pauses YouTube');
 query.value='pankhida';query.oninput();assert.ok(list.children.length>0&&list.children.length<16);
 context.navigator.onLine=false;await list.children[0].children[0].onclick();assert.match(status.textContent,/offline/);
 category.value='techno';category.onchange();query.value='';query.oninput();assert.equal(list.children.length,8);
 options.events.onAutoplayBlocked();assert.match(status.textContent,/blocked automatic playback/);options.events.onError();assert.match(status.textContent,/cannot play/);
 const attached=list.children[0].children[1].children[0];attached.files=[{name:'Garba.mp3',size:100,type:'audio/mpeg'}];await attached.onchange();assert.equal(localPlays,1,'A linked Garba song must play through the full local DJ engine even offline');
 label.children[0].files=[{name:'test.mp3',size:100,type:'audio/mpeg'}];await label.children[0].onchange();assert.equal(imports,2);
 local.onclick();assert.equal(opened,1);assert.equal(panel.hidden,true);
 assert.equal(Object.values(catalogue.slots).flat().length,88);for(const t of Object.values(catalogue.slots).flat())assert.match(t.id,/^[\w-]{11}$/);
 console.log('PASS: 88 songs, eight collections, filtering, audio-only controls, automatic next, playback handoff, offline message, file import and DJ navigation.');
})().catch(e=>{console.error(e);process.exitCode=1;});



