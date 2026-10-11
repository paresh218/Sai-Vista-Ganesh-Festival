const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class El{constructor(){this.children=[];this.audio=[];}append(...els){this.children.push(...els)}querySelector(s){return this.lookup?.[s]}querySelectorAll(){return this.audio}removeAttribute(){}after(){}setAttribute(){}addEventListener(t,f){this[t]=f}showModal(){this.open=true}close(){this.open=false}}
const title=new El(),controls=new El(),section=new El(),body=new El(),audio={src:'blob:song',paused:false,currentTime:5};section.children=[title,controls];
const created=[];vm.runInNewContext(fs.readFileSync('song-popup.js','utf8'),{document:{getElementById:()=>section,body,createElement:()=>{const e=new El();e.lookup={'#navratriSongsTitle':title,'.player-controls':controls};e.audio=[audio];created.push(e);return e;}}});
const get=name=>created.find(e=>e.textContent===name);
get('Open DJ player ♫').onclick();assert.equal(body.children[0].open,true);get('Minimise player').onclick();assert.equal(body.children[0].open,false);assert.equal(audio.paused,false);
get('Set cue').onclick();audio.currentTime=20;get('Go to cue').onclick();assert.equal(audio.currentTime,5);
get('Loop start').onclick();audio.currentTime=8;get('Loop end').onclick();const content=created.find(e=>e.timeupdate);content.timeupdate({target:audio});assert.equal(audio.currentTime,5);
get('Clear loop').onclick();audio.currentTime=9;content.timeupdate({target:audio});assert.equal(audio.currentTime,9);
console.log('PASS: popup minimisation preserves playback; cue jump and loop/reset');
