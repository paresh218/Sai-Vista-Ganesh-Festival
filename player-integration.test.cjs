const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const scripts=['dj-decks','playlist-time','navratri-songs','garba-special','garba-dj-controls','song-popup','dj-studio-loader','song-mini','song-retro','song-layout','player-modern','music-evening'];
const wait=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(t){
 const section=fs.readFileSync('index.html','utf8').match(/<section id="navratriSongs"[\s\S]*?<\/section>/)[0];
 const dom=new JSDOM('<!doctype html><body><button id="weekendMusicOpen">Open music</button><main>'+section+'</main></body>',{url:'https://festival.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 t.after(()=>w.close());const errors=[],intervals=new Map(),rafs=[];let serial=0,offline=false,storageBlocked=false,downloads=0;
 w.addEventListener('error',e=>errors.push(e.error));w.setInterval=(fn,ms)=>{const id=++serial;intervals.set(id,{fn,ms});return id;};w.clearInterval=id=>intervals.delete(id);w.requestAnimationFrame=fn=>{rafs.push(fn);return rafs.length;};w.matchMedia=()=>({matches:false});
 w.URL.createObjectURL=()=>`blob:fixture-${++serial}`;w.URL.revokeObjectURL=()=>{};w.AbortSignal=AbortSignal;w.AbortController=AbortController;w.Blob=Blob;Object.defineProperty(w,'crypto',{value:require('node:crypto').webcrypto});
 const session={handlers:{},setActionHandler(name,fn){this.handlers[name]=fn;}};Object.defineProperty(w.navigator,'mediaSession',{value:session});Object.defineProperty(w.navigator,'audioSession',{value:{}});w.navigator.storage={persist:async()=>true};w.MediaMetadata=class{constructor(data){Object.assign(this,data);}};
 const media=w.HTMLMediaElement.prototype;for(const [name,get]of Object.entries({paused(){return this._paused!==false;},duration(){return 100;},readyState(){return 4;},ended(){return this._ended||false;}}))Object.defineProperty(media,name,{configurable:true,get});
 media.canPlayType=()=> 'probably';media.play=function(){this._paused=false;this._ended=false;this.dispatchEvent(new w.Event('play'));this.dispatchEvent(new w.Event('playing'));return Promise.resolve();};media.pause=function(){this._paused=true;this.dispatchEvent(new w.Event('pause'));};media.load=()=>{};
 const param=()=>({value:0,setTargetAtTime(v){this.value=v;}}),node=()=>({connect(){},disconnect(){},gain:param(),frequency:param(),Q:param(),delayTime:param(),threshold:param(),knee:param(),ratio:param()});
 const samples=Float32Array.from({length:12000},(_,i)=>Math.sin(i)*((i%500)<80?.7:.02));
 w.AudioContext=class{constructor(){this.state='running';this.currentTime=0;this.sampleRate=8000;this.destination=node();}resume(){this.state='running';return Promise.resolve();}createGain(){return node();}createBiquadFilter(){return node();}createDynamicsCompressor(){return node();}createMediaElementSource(){return node();}createDelay(){return node();}createConvolver(){return node();}createBuffer(c,n){return{getChannelData:()=>new Float32Array(n)};}createAnalyser(){return{...node(),frequencyBinCount:64,getByteFrequencyData(bytes){bytes.fill(80);},getByteTimeDomainData(bytes){bytes.fill(128);}};}decodeAudioData(){return Promise.resolve({duration:12,sampleRate:1000,getChannelData:()=>samples});}createMediaStreamDestination(){return{...node(),stream:{getTracks:()=>[{stop(){}}]}};}};
 w.HTMLCanvasElement.prototype.getContext=()=>({clearRect(){},fillRect(){},fillText(){},beginPath(){},lineTo(){},moveTo(){},stroke(){}});
 w.Worker=class{postMessage(data){const analyse=require('./dj-analysis-worker.js');queueMicrotask(()=>this.onmessage?.({data:{id:data.id,result:analyse(data.samples,data.rate)}}));}terminate(){}};
 w.MediaRecorder=class{static isTypeSupported(){return true;}constructor(stream,options){this.state='inactive';this.mimeType=options?.mimeType||'audio/webm';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['mix'])});this.onstop?.();}};
 const store=new Map();w.SaiVistaOffline={has:async key=>{if(storageBlocked)throw Error('Storage blocked');return store.has(key);},get:async key=>{if(storageBlocked)throw Error('Storage blocked');return store.get(key);},put:async(key,blob)=>{if(storageBlocked)throw Error('Storage blocked');store.set(key,blob);},clear:async()=>store.clear()};
 const groups=[{key:'day6',name:'Day 6',day:6,folderId:'six',songs:[{id:'a',name:'First planned song',size:3,mime:'audio/mpeg'},{id:'b',name:'Second planned song',size:3,mime:'audio/mpeg'}]},{key:'empty',name:'Empty playlist',folderId:'empty',songs:[]}];
 w.SaiVistaSongs={endpoint:'https://festival.test/api',folderUrl:'https://drive.google.com/'};w.NavratriDays={current:()=>({day:6})};
 w.fetch=async url=>{if(offline)throw Error('Offline');if(String(url).includes('garba-catalogue'))return{ok:true,json:async()=>JSON.parse(fs.readFileSync('garba-catalogue.json','utf8'))};if(String(url).includes('action=audio')){downloads++;return{ok:true,json:async()=>({ok:true,mime:'audio/mpeg',audio:'AQID'})};}return{ok:true,json:async()=>({ok:true,groups})};};
 let yt,ytOptions;w.YT={Player:class{constructor(id,options){yt=this;ytOptions=options;this.time=0;this.state=2;queueMicrotask(()=>options.events.onReady({target:this}));}loadVideoById(id){this.id=id;this.time=0;this.state=1;ytOptions.events.onStateChange({data:1});}playVideo(){this.state=1;ytOptions.events.onStateChange({data:1});}pauseVideo(){this.state=2;ytOptions.events.onStateChange({data:2});}stopVideo(){this.state=2;}getPlayerState(){return this.state;}getCurrentTime(){return this.time;}getDuration(){return 100;}seekTo(time){this.time=time;}setVolume(n){this.volume=n;}getAvailablePlaybackRates(){return[1,1.5];}setPlaybackRate(n){this.rate=n;}getPlaybackRate(){return this.rate||1;}mute(){this.muted=true;}unMute(){this.muted=false;}isMuted(){return this.muted;}}};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 for(const name of scripts){if(name==='dj-studio-loader')Object.defineProperty(d,'currentScript',{configurable:true,value:{src:'https://festival.test/dj-studio-loader.js'}});w.eval(fs.readFileSync(name+'.js','utf8'));}
 const settle=async()=>{for(let i=0;i<5;i++)await wait();assert.deepEqual(errors,[],'No uncaught UI errors');};await settle();
 const $=id=>d.getElementById(id),button=text=>[...d.querySelectorAll('button')].find(e=>e.textContent===text),click=async text=>{const b=button(text);assert.ok(b,`Button exists: ${text}`);b.click();await settle();},input=(id,value,type='input')=>{const el=$(id);el.value=value;el.dispatchEvent(new w.Event(type,{bubbles:true}));};
 const pulse=async ms=>{for(const item of [...intervals.values()])if(item.ms===ms)item.fn();await settle();};
 w.SaiVistaStudioBridge.dj.fadeSeconds=0;
 return{w,d,$,button,click,input,pulse,settle,bridge:w.SaiVistaStudioBridge,store,session,groups,errors,rafs,get yt(){return yt;},setOffline(v){offline=v;},setStorageBlocked(v){storageBlocked=v;},get downloads(){return downloads;}};
}
test('complete UI: all views, expand/compact, minimisation and reopening retain controls',async t=>{
 const e=await setup(t);await e.click('Open DJ player ♫');const dialog=e.d.querySelector('.song-popup');assert.equal(dialog.open,true);
 for(const [label,view]of [['Garba Special','garba'],['Sound','sound'],['DJ studio','studio'],['Offline','offline'],['Daily songs','playlist']]){await e.click(label);assert.equal(e.d.querySelector('.player-workspace').dataset.view,view);assert.equal(e.d.querySelector('.modern-tabs button[aria-pressed="true"]').textContent,label);}
 for(let i=0;i<3;i++){await e.click('Expand player');assert.ok(dialog.classList.contains('modern-player'));assert.ok(dialog.classList.contains('is-expanded'));await e.click('Compact view');assert.ok(dialog.classList.contains('modern-player'));}
 await e.click('Minimise player');assert.equal(e.d.querySelector('.song-mini').hidden,false);await e.click('Open player');assert.equal(dialog.open,true);assert.equal(e.d.querySelector('.song-mini').hidden,true);
});
test('local controls: play, seek, reorder, EQ, mute, speed, repeat, automatic next and failed refresh',async t=>{
 const e=await setup(t);await e.click('Open DJ player ♫');await e.bridge.load(0);assert.equal(e.bridge.audio.paused,false);assert.equal(e.bridge.dj.active.song.id,'a');
 e.input('songSeek','500');assert.equal(e.bridge.audio.currentTime,50);e.input('songVolume','35');assert.equal(e.bridge.audio.volume,.35);e.$('songMute').click();assert.equal(e.bridge.audio.muted,true);e.$('songMute').click();assert.equal(e.bridge.audio.muted,false);
 e.input('songSpeed','1.5','change');assert.equal(e.bridge.audio.playbackRate,1.5);e.input('songPreset','bass','change');assert.equal(e.$('songBass').value,'6');e.$('songResetEq').click();assert.equal(e.$('songBass').value,'0');
 const move=e.d.querySelector('.song-move');move.value='1';move.dispatchEvent(new e.w.Event('change',{bubbles:true}));assert.equal(e.bridge.songs[1].id,'a');assert.equal(e.bridge.audio.paused,false);
 e.$('songPlayPause').click();await e.settle();assert.equal(e.bridge.audio.paused,true);e.$('songPlayPause').click();await e.settle();assert.equal(e.bridge.audio.paused,false);
 e.bridge.selectGroup('day6');await e.bridge.startPlanned();assert.equal(e.bridge.dj.active.song.id,'b','Tonight respects saved ordering');e.bridge.audio.currentTime=99;e.bridge.audio.dispatchEvent(new e.w.Event('timeupdate'));await e.settle();assert.equal(e.bridge.dj.active.song.id,'a');
 e.$('songRepeat').click();e.$('songRepeat').click();e.bridge.audio.currentTime=100;e.bridge.audio.dispatchEvent(new e.w.Event('ended'));assert.equal(e.bridge.audio.currentTime,0);
 e.setOffline(true);await e.$('refreshSongs').onclick();assert.equal(e.bridge.audio.paused,false);assert.equal(e.bridge.songs.length,2);
});
test('online Garba uses shared controls and cannot be overwritten by the paused local deck',async t=>{
 const e=await setup(t);await e.click('Open DJ player ♫');await e.bridge.load(0);await e.click('Garba Special');e.d.querySelector('.garba-track>button').click();await e.settle();assert.equal(e.bridge.audio.paused,true);assert.equal(e.w.SaiVistaGarba.active,true);
 e.yt.time=65;await e.pulse(500);assert.equal(e.$('songElapsed').textContent,'1:05');
 e.bridge.audio.currentTime=7;e.bridge.audio.dispatchEvent(new e.w.Event('timeupdate'));assert.equal(e.$('songElapsed').textContent,'1:05','Paused local audio must not overwrite online progress');
 e.input('songVolume','25');assert.equal(e.yt.volume,25);e.input('songSeek','300');assert.equal(e.yt.time,30);e.input('songSpeed','1.5','change');assert.equal(e.yt.rate,1.5);e.$('songMute').click();assert.equal(e.yt.muted,true);e.$('songPlayPause').click();assert.equal(e.yt.state,2);e.$('songPlayPause').click();assert.equal(e.yt.state,1);
 e.$('stopSong').click();await e.settle();assert.equal(e.w.SaiVistaGarba.active,false);assert.equal(e.$('songPlayPause').disabled,true,'Stop clears the shared controls');
});
test('offline readiness, storage failures, imported Garba and Tonight planned playback',async t=>{
 const e=await setup(t);await e.click('Open DJ player ♫');await e.click('Offline');await e.click('Check offline readiness');assert.match(e.d.querySelector('.offline-readiness').textContent,/0 of 2 songs saved/);
 await e.$('songSaveDevice').onclick();await e.click('Check offline readiness');assert.match(e.d.querySelector('.offline-readiness').textContent,/2 of 2 songs saved.*Ready offline/);
 e.setOffline(true);await e.click('Daily songs');await e.click('▶ Start tonight’s music');assert.equal(e.bridge.dj.active.song.id,'a');assert.equal(e.$('songShuffle').getAttribute('aria-pressed'),'false');assert.equal(e.$('songRepeat').textContent,'Repeat: off');
 e.setStorageBlocked(true);await e.click('Offline');await e.click('Check offline readiness');assert.match(e.d.querySelector('.offline-readiness').textContent,/unconfirmed/);e.setStorageBlocked(false);
 const file=new Blob(['my garba'],{type:'audio/mpeg'});file.name='My Garba.mp3';const imported=await e.bridge.importGarba(file);await e.bridge.playGarba(imported.id);assert.equal(e.bridge.dj.active.song.id,imported.id);assert.equal(e.bridge.audio.paused,false);assert.equal(e.downloads,2);
});
test('advanced studio: staged deck, manual mixing, beat loops, effects and local recording',async t=>{
 const e=await setup(t);await e.click('Open DJ player ♫');await e.bridge.load(0);await e.click('DJ studio');await e.click('Open advanced DJ studio');e.w.eval(fs.readFileSync('dj-studio.js','utf8'));await e.pulse(200);
 e.input('studioTrack','b','change');await e.$('studioLoad').onclick();assert.equal(e.bridge.dj.staged.song.id,'b');assert.equal(e.bridge.audio.paused,false);await e.$('studioStart').onclick();assert.equal(e.bridge.dj.manual,true);assert.equal(e.bridge.dj.active.song.id,'b');
 e.input('studioFader','50');assert.ok(e.bridge.dj.active.audio.volume>0);assert.ok(e.bridge.dj.outgoing.audio.volume>0);
 e.input('studioBBpm','120','change');e.$('studioLoop').click();assert.equal(e.bridge.dj.active.audio.saiVistaLoop,true);e.$('studioUnloop').click();assert.equal(e.bridge.dj.active.audio.saiVistaLoop,false);
 for(const [id,value]of [['studioFilter','1000'],['studioEcho','20'],['studioReverb','10']])e.input(id,value);assert.doesNotMatch(e.$('studioStatus').textContent,/unavailable|error/i);
 await e.$('studioRecord').onclick();assert.equal(e.$('studioRecord').textContent,'Stop recording');await e.$('studioRecord').onclick();assert.equal(e.$('studioDownload').hidden,false);assert.match(e.$('studioDownload').download,/Sai-Vista-mix/);
 e.$('studioFinish').click();assert.equal(e.bridge.dj.manual,false);assert.equal(e.bridge.dj.outgoing,null);
});
test('starting a staged DJ deck stops online Garba instead of playing both sources',async t=>{
 const e=await setup(t);await e.click('Open DJ player ♫');await e.bridge.load(0);await e.bridge.dj.stage(e.bridge.songs[1],e.bridge.group.key);
 await e.click('Garba Special');e.d.querySelector('.garba-track>button').click();await e.settle();assert.equal(e.yt.state,1);assert.equal(e.bridge.audio.paused,true);
 await e.bridge.dj.startManual();assert.equal(e.w.SaiVistaGarba.active,false);assert.equal(e.yt.state,2);assert.equal(e.bridge.audio.paused,false);
});
test('rapid song selection, empty playlists, search, media controls and missing audio recover safely',async t=>{
 const e=await setup(t);await e.click('Open DJ player ♫');await e.click('Garba Special');const rows=e.d.querySelectorAll('.garba-track>button');rows[0].click();rows[1].click();await e.settle();assert.equal(e.yt.id,JSON.parse(fs.readFileSync('garba-catalogue.json','utf8')).slots.prachin[1].id);
 e.session.handlers.pause();assert.equal(e.yt.state,2);e.session.handlers.play();assert.equal(e.yt.state,1);
 e.input('songSearch','nonexistent song');assert.equal(e.d.querySelectorAll('.song-row').length,0);e.input('songSearch','');assert.equal(e.d.querySelectorAll('.song-row').length,2);
 e.bridge.selectGroup('empty');assert.equal(e.bridge.songs.length,0);assert.match(e.$('songStatus').textContent,/No songs/);
 const file=new Blob(['missing audio'],{type:'audio/mpeg'});file.name='Missing.mp3';const imported=await e.bridge.importGarba(file);e.store.clear();e.setOffline(true);await e.bridge.playGarba(imported.id);assert.match(e.$('songPlaybackStatus').textContent,/missing.*Import/i);
});
test('live spectrum runs for local audio, pauses in background and leaves audio playing',async t=>{
 const e=await setup(t);await e.click('Open DJ player ♫');await e.bridge.load(0);const frame=e.rafs.at(-1);frame();assert.equal(e.d.querySelector('.evening-spectrum').hidden,false);assert.equal(e.d.querySelector('.modern-equalizer').hidden,true);
 Object.defineProperty(e.d,'hidden',{configurable:true,value:true});e.d.dispatchEvent(new e.w.Event('visibilitychange'));frame();assert.equal(e.bridge.audio.paused,false,'Backgrounding must not pause audio');
 Object.defineProperty(e.d,'hidden',{configurable:true,value:false});e.bridge.audio.pause();frame();assert.equal(e.d.querySelector('.evening-spectrum').hidden,true);assert.equal(e.d.querySelector('.modern-equalizer').hidden,false);
});
test('Tonight stays in Daily songs and offline actions stay inside Offline',async t=>{
 const e=await setup(t);await e.click('Open DJ player ♫');
 assert.ok(e.d.querySelector('.workspace-playlist .evening-card'),'Tonight belongs inside the daily playlist, not above the whole player');
 const check=e.button('Check offline readiness'),save=e.button('Save selected playlist');
 assert.ok(check.closest('.modern-offline'),'Readiness action must stay in Offline');
 assert.ok(save.closest('.modern-offline'),'Save action must stay in Offline');
 await e.click('Daily songs');assert.equal(check.closest('.modern-offline').hidden,true);
 await e.click('Offline');assert.equal(check.closest('.modern-offline').hidden,false);
 check.click();await e.settle();assert.match(e.d.querySelector('.offline-readiness').textContent,/0 of 2 songs saved/);
});

test('seek colours follow local playback, seeking, online playback and stop',async t=>{
 const e=await setup(t);await e.bridge.load(0);
 e.bridge.audio.currentTime=25;await e.pulse(500);
 assert.equal(e.$('songSeek').style.getPropertyValue('--seek-progress'),'25%');
 e.input('songSeek','700');assert.equal(e.$('songSeek').style.getPropertyValue('--seek-progress'),'70%');
 await e.click('Garba Special');e.d.querySelector('.garba-track>button').click();await e.settle();e.yt.time=40;await e.pulse(500);
 assert.equal(e.$('songSeek').style.getPropertyValue('--seek-progress'),'40%');
 e.$('stopSong').click();await e.settle();assert.equal(e.$('songSeek').style.getPropertyValue('--seek-progress'),'0%');
});

test('saved audio unlocks sound before async loading and recovers interrupted output without pause/play',async t=>{
 const e=await setup(t);const file=new Blob(['audio'],{type:'audio/mpeg'});file.name='Saved.mp3';const imported=await e.bridge.importGarba(file);
 const pending=e.bridge.playGarba(imported.id);
 assert.ok(e.bridge.ctx,'AudioContext is created in the initial Play gesture, before storage awaits');await pending;
 const audio=e.bridge.audio,ctx=e.bridge.ctx;let resumes=0;ctx.resume=async()=>{resumes++;ctx.state='running';};
 for(const state of ['suspended','interrupted']){ctx.state=state;await e.pulse(500);assert.equal(ctx.state,'running');assert.equal(audio.paused,false);}
 assert.equal(resumes,2);assert.equal(e.bridge.audio,audio,'Recovery preserves the track and position');
 audio.pause();ctx.state='suspended';await e.pulse(500);assert.equal(resumes,2,'User-paused audio stays paused');
});

test('blocked sound recovery asks for a tap and does not retry in a loop',async t=>{
 const e=await setup(t);await e.bridge.load(0);let calls=0;
 e.bridge.ctx.resume=async()=>{calls++;throw Error('Gesture required');};e.bridge.ctx.state='interrupted';
 e.bridge.ctx.onstatechange();await e.settle();assert.match(e.$('songPlaybackStatus').textContent,/Press Play/);
 await e.pulse(500);await e.pulse(500);assert.equal(calls,1,'Blocked automatic recovery has a cooldown');
 e.bridge.ctx.resume=async()=>{e.bridge.ctx.state='running';};await e.$('songPlayPause').onclick();assert.equal(e.bridge.audio.paused,false);
});
