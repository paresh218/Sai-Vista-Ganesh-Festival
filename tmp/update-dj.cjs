const fs=require('fs');let s=fs.readFileSync('navratri-songs.js','utf8');
s=s.replace("config=window.SaiVistaSongs, audio=$('songAudio');","config=window.SaiVistaSongs; let audio=$('songAudio');");
s=s.replace("let catalogue=[], songs=[],","let catalogue=[], songs=[],");
const start=s.indexOf(' for(const day of config.days)');
const end=s.indexOf(' function eq()',start);
s=s.slice(0,start)+` const sources=new WeakSet();
 function groups(preferred) {
   const previous=preferred || $('songDay').value;
   $('songDay').replaceChildren();
   catalogue.forEach(group=>{const option=document.createElement('option');option.value=group.key;option.textContent=group.name;$('songDay').append(option);});
   $('songDay').value=catalogue.some(g=>g.key===previous)?previous:(catalogue.find(g=>g.day===(window.NavratriDays?.current()?.day||1))?.key||catalogue[0]?.key||'');
 }
 function selected(){return catalogue.find(group=>group.key===$('songDay').value);}
`+s.slice(end);
const soundStart=s.indexOf(' async function sound()');const soundEnd=s.indexOf(' function position()',soundStart);
s=s.slice(0,soundStart)+` async function sound(element=audio){try{if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error();ctx=new AC();bands=['lowshelf','peaking','highshelf'].map((type,i)=>{const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=[200,1200,4000][i];f.Q.value=.7;return f;});const gain=ctx.createGain();gain.gain.value=.5;const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-6;limiter.knee.value=6;limiter.ratio.value=12;bands[0].connect(bands[1]);bands[1].connect(bands[2]);bands[2].connect(gain);gain.connect(limiter);limiter.connect(ctx.destination);eq();}if(!sources.has(element)){ctx.createMediaElementSource(element).connect(bands[0]);sources.add(element);}await ctx.resume();$('songEqStatus').textContent='Equalizer active · both decks share your sound settings.';}catch(_){$('songEqStatus').textContent='Equalizer unavailable in this browser.';}}
`+s.slice(soundEnd);
const clearStart=s.indexOf(' function clear()');const clearEnd=s.indexOf(' function stop()',clearStart);
s=s.slice(0,clearStart)+` function clear(){generation++;dj.stop();audio=$('songAudio');$('songPlayer').replaceChildren();$('songPlayer').hidden=true;$('songPlayPause').disabled=true;$('songPlayPause').textContent='Play';position();}
`+s.slice(clearEnd);
s=s.replace("' songs · Day '+$('songDay').value","' songs · '+(selected()?.name||'Library')");
s=s.replace("'No songs uploaded for this day yet.'","'No songs uploaded in this folder yet.'");
const loadStart=s.indexOf(' async function load(i)');const loadEnd=s.indexOf(' function next(',loadStart);
s=s.slice(0,loadStart)+` let loading=false;
 function following(){if(repeat===2)return index;if(shuffle && songs.length>1){let n=Math.floor(Math.random()*(songs.length-1));return n>=index?n+1:n;}return index+1<songs.length?index+1:repeat===1?0:-1;}
 let queued=-1;
 function prepare(){queued=following();$('songNextName').textContent=queued>=0?'Up next: '+songs[queued].name:'End of playlist';if(queued>=0)dj.preload(songs[queued],selected().key);}
 async function fetchBlob(song,group,signal){
   if(song.size>25000000)throw Error('This file exceeds the 25 MB DJ-player limit. Use Drive preview.');
   const url=new URL(config.endpoint);url.searchParams.set('action','audio');url.searchParams.set('group',group);url.searchParams.set('id',song.id);
   const r=await fetch(url,{signal,cache:'no-store'}),data=await r.json();
   if(!r.ok||!data.ok||typeof data.audio!=='string'||! /^(audio\\/|video\\/mp4$|application\\/octet-stream$)/.test(data.mime))throw Error(data.error||'Unable to load this song.');
   if(data.audio.length>33400000)throw Error('This file is too large. Use Drive preview.');
   const binary=atob(data.audio),bytes=new Uint8Array(binary.length);for(let n=0;n<binary.length;n++)bytes[n]=binary.charCodeAt(n);
   return new Blob([bytes],{type:data.mime});
 }
 const dj=new window.SaiVistaDJ({
   fetchBlob,rate:()=>Number($('songSpeed').value),connect:sound,
   makeAudio:()=>{const element=document.createElement('audio');element.hidden=true;$('songAudio').after(element);return element;},
   commit:(element,song)=>{audio=element;index=songs.findIndex(s=>s.id===song.id);bindAudio();$('songNowPlaying').textContent=song.name;$('songQueuePosition').textContent=(index+1)+' / '+songs.length;$('songPlayPause').disabled=false;$('songPlayPause').textContent='Pause';$('songPlaybackStatus').textContent=dj.outgoing?'Crossfading…':'Playing';$('songPlayer').replaceChildren();fallback(song);render();prepare();if(navigator.mediaSession&&window.MediaMetadata){navigator.mediaSession.metadata=new MediaMetadata({title:song.name,artist:'Sai Vista',album:selected().name});navigator.mediaSession.playbackState='playing';}},
   error:error=>{$('songPlaybackStatus').textContent='Could not switch: '+(error.name==='AbortError'?'loading timed out':error.message)+'. Current playback is kept.';}
 });
 async function load(i){if(!songs[i])return;loading=true;const token=++generation;$('songPlaybackStatus').textContent=index>=0?'Preparing '+songs[i].name+' · current song keeps playing':'Loading '+songs[i].name+'…';const ok=await dj.switch(songs[i],selected().key);if(token===generation){loading=false;if(!ok&&index<0)fallback(songs[i]);}}
`+s.slice(loadEnd);
const dayStart=s.indexOf(' function day()');const dayEnd=s.indexOf(' async function refresh()',dayStart);
s=s.slice(0,dayStart)+` function day(){stop();$('songSearch').value='';const group=selected();songs=group?.songs.filter(s=>typeof s.name==='string'&&/^[A-Za-z0-9_-]+$/.test(s.id))||[];$('songUploadLink').href=group?'https://drive.google.com/drive/folders/'+group.folderId:config.folderUrl;$('songUploadLink').textContent=group?'Upload to '+group.name+' ↗':'Open upload folder ↗';render();}
`+s.slice(dayEnd);
s=s.replace("!Array.isArray(data.days)","!Array.isArray(data.groups)");
s=s.replace("catalogue=data.days;day();","const previous=$('songDay').value;catalogue=data.groups;groups(previous);if(index>=0 && selected()?.songs.some(s=>s.id===songs[index]?.id)){const id=songs[index].id;songs=selected().songs;index=songs.findIndex(s=>s.id===id);render();prepare();}else day();");
s=s.replace("else audio.pause();","else dj.pause();");
s=s.replace(" audio.onplay=", " function bindAudio(){audio.onplay=");
s=s.replace("audio.onended=()=>next(1,true);audio.ontimeupdate=audio.onloadedmetadata=position;","audio.onended=()=>{if(repeat===2){audio.currentTime=0;audio.play().catch(()=>{});}else if(!loading && queued>=0)load(queued);else if(!loading)$('songPlaybackStatus').textContent='Playlist finished.';};audio.ontimeupdate=()=>{position();if(!loading && !audio.paused && repeat!==2 && queued>=0 && Number.isFinite(audio.duration) && audio.duration-audio.currentTime<=Number($('songCrossfade').value) && audio.currentTime>0)load(queued);};audio.onloadedmetadata=position;");
s=s.replace("Use Drive preview.';};\n $('songSeek')","Use Drive preview.';};}\n $('songSeek')");
s=s.replace("audio.volume=Number($('songVolume').value)/100;","dj.volume=Number($('songVolume').value)/100;dj.applyVolume();");
s=s.replace("audio.muted=!audio.muted;","dj.muted=!dj.muted;dj.applyVolume();").replace("audio.muted?'Unmute'","dj.muted?'Unmute'").replace("String(audio.muted)","String(dj.muted)");
s=s.replace("$('songNext').onclick=()=>next();","$('songNext').onclick=()=>queued>=0?load(queued):next();");
s=s.replace("String(shuffle));};","String(shuffle));if(index>=0)prepare();};");
s=s.replace("['off','all','one'][repeat];};","['off','all','one'][repeat];if(index>=0)prepare();};");
s=s.replace("pause:()=>audio.pause()","pause:()=>dj.pause()");
s=s.replace("window.addEventListener('pagehide',stop);day();refresh();","$('songCrossfade').oninput=()=>{dj.fadeSeconds=Number($('songCrossfade').value);$('songCrossfadeValue').textContent=dj.fadeSeconds+' seconds';};window.addEventListener('pagehide',stop);refresh();");
fs.writeFileSync('navratri-songs.js',s);
let html=fs.readFileSync('index.html','utf8');
html=html.replace('<label for="songDay">Choose day</label>','<label for="songDay">Choose day / folder</label>');
html=html.replace('<div class="player-settings"><label>Volume','<p id="songNextName">Select a song to prepare the next track.</p><div class="player-settings"><label>Crossfade <input id="songCrossfade" type="range" min="0" max="10" value="3"><output id="songCrossfadeValue">3 seconds</output></label></div><div class="player-settings"><label>Volume');
html=html.replace('    <script src="navratri-songs.js"></script>','    <script src="dj-decks.js"></script>\n    <script src="navratri-songs.js"></script>');
html=html.replace('Use MP3 or another audio format supported by Google Drive.','Use MP3, M4A or MP4 with a playable audio track. New folders and nested songs appear after Refresh songs.');
fs.writeFileSync('index.html',html);
let sw=fs.readFileSync('service-worker.js','utf8').replace('2026-v76','2026-v77').replace('  "navratri-songs.js",','  "navratri-songs.js",\n  "dj-decks.js",');
fs.writeFileSync('service-worker.js',sw);

