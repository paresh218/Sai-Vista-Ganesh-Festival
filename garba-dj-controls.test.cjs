const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const listeners={},nodes={},calls=[];let tick,time=25;
const g={active:true,track:{id:'one'},position:0,count:8,player:{getDuration:()=>100,getCurrentTime:()=>time,getPlayerState:()=>1,seekTo:n=>calls.push(['seek',n]),setVolume:n=>calls.push(['volume',n]),getAvailablePlaybackRates:()=>[1,1.5],setPlaybackRate:n=>calls.push(['rate',n]),getPlaybackRate:()=>1},toggle:()=>calls.push('toggle'),next:()=>calls.push('next'),previous:()=>calls.push('previous'),shuffle:()=>calls.push('shuffle'),stop:()=>calls.push('stop')};
vm.runInNewContext(fs.readFileSync('garba-dj-controls.js','utf8'),{window:{SaiVistaGarba:g},document:{getElementById:id=>nodes[id]||=( {} ),addEventListener:(name,handler)=>listeners[name]=handler},setInterval:fn=>{tick=fn;return{unref(){}};},Math,String});
function fire(type,id,value,textContent){let intercepted=false;const el={id,value,textContent};el.closest=()=>el;listeners[type]({type,target:el,preventDefault(){},stopImmediatePropagation(){intercepted=true;}});return intercepted;}
tick();assert.equal(nodes.songSeek.value,250);assert.equal(nodes.songPlayPause.disabled,false);
assert.equal(fire('click','songPlayPause'),true);assert.equal(calls.at(-1),'toggle');fire('click','songNext');assert.equal(calls.at(-1),'next');
fire('input','songSeek','700');assert.deepEqual(calls.at(-1),['seek',70]);fire('input','songVolume','60');assert.deepEqual(calls.at(-1),['volume',60]);
fire('change','songSpeed','1.5');assert.deepEqual(calls.at(-1),['rate',1.5]);fire('change','songSpeed','1.1');assert.match(nodes.songPlaybackStatus.textContent,/unavailable/);
fire('click','','','Set cue');time=60;fire('click','','','Go to cue');assert.deepEqual(calls.at(-1),['seek',25]);
fire('click','','','Loop 8 seconds');time=69;tick();assert.deepEqual(calls.at(-1),['seek',60]);fire('click','songRepeat');assert.equal(g.repeatOne,true);
g.active=false;assert.equal(fire('click','songPlayPause'),false,'Local DJ events must retain their original handlers');
console.log('PASS: shared Garba transport, seeking, volume, supported speed, repeat, cues, timed loops and local-DJ handoff.');
