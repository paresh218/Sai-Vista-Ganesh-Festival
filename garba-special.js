// Online source links and device-owned audio share one entry point.
(() => {
 const bridge=window.SaiVistaStudioBridge;if(!bridge)return;
 const make=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 const panel=make('section');panel.className='garba-special';panel.hidden=true;
 const launch=make('button','Garba Special ♫');launch.type='button';launch.className='btn btn-dark';
 const heading=make('h3','Garba Special'),note=make('p','Eight Garba collections to enjoy. YouTube songs need internet. Choose Use my audio beside a song to unlock all DJ controls and offline playback.');
 const category=make('select');category.setAttribute('aria-label','Garba collection');
 const search=make('input');search.type='search';search.placeholder='Find a Garba song';search.setAttribute('aria-label','Find a Garba song');
 const list=make('div');list.className='garba-track-list';
 const status=make('p');status.setAttribute('role','status');
 const mount=make('div');mount.id='garbaYouTube';
 const video=make('div');video.className='garba-video garba-audio-only';video.setAttribute('aria-hidden','true');video.append(mount);
 const controls=make('div');controls.className='player-controls';
 const toggle=make('button','Play / Pause');toggle.type='button';controls.append(toggle);
 const next=make('button','Next song'),shuffle=make('button','Shuffle: off'),stop=make('button','Stop online music');
 for(const b of [next,shuffle,stop])b.type='button';controls.append(next,shuffle,stop);
 const fileLabel=make('label','Save your audio files for offline DJ playback');
 const files=make('input');files.type='file';files.multiple=true;files.accept='audio/*,.mp3,.m4a,.wav,.ogg,.flac';fileLabel.append(files);
 const local=make('button','Open saved Garba in DJ player');local.type='button';
 panel.append(heading,note,category,search,video,controls,status,list,fileLabel,make('p','Imported files stay in this browser on this device. Keep a backup; clearing browser storage removes saved audio. YouTube songs cannot be saved here.'),local);
 document.getElementById('songDay').closest('.song-day-picker')?.append(launch);
 if(!launch.parentNode)document.getElementById('songSearch').parentNode.before(launch);
 launch.after(panel);
 let catalogue,tracks=[],at=-1,random=false,player,playerReady=false,desiredVideo=null,apiPromise,request=0;
 let matches={};try{matches=JSON.parse(localStorage.getItem('saiVistaGarbaMatches')||'{}');}catch(_){}
 const labels={prachin:'Traditional',sanedo:'Sanedo',khelaiya:'Khelaiya',indipop:'Indipop',filmi:'Film songs',fusion:'Fusion',gujpop:'Gujarati pop',techno:'Techno'};
 function mediaControls(){
  if(!navigator.mediaSession)return;
  if(window.MediaMetadata&&tracks[at])navigator.mediaSession.metadata=new window.MediaMetadata({title:tracks[at].title,artist:tracks[at].artist,album:'Garba Special'});
  for(const [action,handler] of Object.entries({play:()=>{if(!playerReady||at<0)return;desiredVideo=tracks[at].id;pauseDJ();player.playVideo();},pause:()=>player?.pauseVideo?.(),stop:()=>stop.onclick(),nexttrack:()=>next.onclick(),previoustrack:()=>play((at-1+tracks.length)%tracks.length),seekto:e=>player?.seekTo?.(e.seekTime,true)}))try{navigator.mediaSession.setActionHandler(action,handler);}catch(_){}
 }
 const pauseDJ=()=>{bridge.dj.cancelSwitch();bridge.dj.pause();};
 function api(){
  if(window.YT?.Player)return Promise.resolve();
  if(apiPromise)return apiPromise;
  apiPromise=new Promise((resolve,reject)=>{const previous=window.onYouTubeIframeAPIReady;const timer=setTimeout(()=>{apiPromise=null;reject(Error('YouTube did not load. Check your internet connection or use saved audio.'));},15000);window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);previous?.();resolve();};const script=make('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timer);apiPromise=null;reject(Error('YouTube is unavailable. Use saved audio or try again.'));};document.head.append(script);});return apiPromise;
 }
 function render(){list.replaceChildren();const q=search.value.toLowerCase();tracks.forEach((t,i)=>{if(!(t.title+' '+t.artist).toLowerCase().includes(q))return;const row=make('div');row.className='garba-track';const b=make('button',(i===at?'♪ ':'')+t.title+' · '+t.artist);b.type='button';b.onclick=()=>play(i);const attach=make('label','Use my audio');attach.className='garba-attach';const input=make('input');input.type='file';input.accept='audio/*,.mp3,.m4a,.wav,.ogg,.flac';input.setAttribute('aria-label','Attach audio for '+t.title);input.onchange=async()=>{const file=input.files[0];if(!file)return;input.disabled=true;try{const song=await bridge.importGarba(file);matches[t.id]=song.id;localStorage.setItem('saiVistaGarbaMatches',JSON.stringify(matches));status.textContent='Audio saved. This song now uses all DJ controls.';await play(i);}catch(e){status.textContent=e.message;}finally{input.disabled=false;}};attach.append(input);row.append(b,attach);list.append(row);});}
 async function play(i){
  const token=++request,t=tracks[i];if(!t)return;if(matches[t.id]&&bridge.getGarbaSong?.(matches[t.id])){stop.onclick();await bridge.playGarba(matches[t.id]);status.textContent=t.title+' · full DJ playback from saved audio';return;}
  if(!navigator.onLine){status.textContent='You are offline. Open saved Garba in the DJ player below.';return;}
  status.textContent='Loading music…';
  try{await api();if(token!==request)return;pauseDJ();at=i;render();status.textContent=t.title+' · use Play / Pause to control music.';
   desiredVideo=t.id;mediaControls();if(window.CustomEvent)window.dispatchEvent(new CustomEvent('sai-vista-garba-track',{detail:{title:t.title,artist:t.artist}}));
   if(player){if(playerReady)player.loadVideoById(t.id);}
   else player=new window.YT.Player('garbaYouTube',{width:'200',height:'200',videoId:t.id,playerVars:{playsinline:1},events:{onReady:e=>{playerReady=true;if(desiredVideo)e.target.loadVideoById(desiredVideo);},onStateChange:e=>{if(e.data===1){if(desiredVideo){pauseDJ();mediaControls();if(navigator.mediaSession)navigator.mediaSession.playbackState="playing";}else player?.pauseVideo?.();}if(e.data===2&&navigator.mediaSession)navigator.mediaSession.playbackState="paused";if(e.data===0&&desiredVideo){if(window.SaiVistaGarba?.repeatOne)player.seekTo(0,true),player.playVideo();else next.onclick();}},onAutoplayBlocked:()=>{status.textContent='Your browser blocked automatic playback. Press Play / Pause to start, or use saved audio.';},onError:()=>{status.textContent='This song cannot play here. Try another song.';}}});
  }catch(e){status.textContent=e.message;}
 }
 toggle.onclick=()=>{if(!playerReady||at<0){if(tracks.length)play(at<0?0:at);return;}if(player.getPlayerState?.()===1){player.pauseVideo();status.textContent='Paused';}else{desiredVideo=tracks[at].id;pauseDJ();player.playVideo();status.textContent=tracks[at].title;}};
 next.onclick=()=>{if(!tracks.length)return;let n=(at+1)%tracks.length;if(random&&tracks.length>1){n=Math.floor(Math.random()*(tracks.length-1));if(n>=at)n++;}play(n);};
 shuffle.onclick=()=>{random=!random;shuffle.textContent='Shuffle: '+(random?'on':'off');shuffle.setAttribute('aria-pressed',String(random));};
 stop.onclick=()=>{request++;desiredVideo=null;player?.stopVideo?.();status.textContent='Online playback stopped.';};
 window.addEventListener('sai-vista-dj-play',()=>{request++;desiredVideo=null;player?.pauseVideo?.();});
 category.onchange=()=>{stop.onclick();tracks=catalogue.slots[category.value]||[];at=-1;render();};search.oninput=render;
 launch.onclick=async()=>{panel.hidden=!panel.hidden;if(panel.hidden||catalogue)return;status.textContent='Loading collections…';try{const r=await fetch('garba-catalogue.json');if(!r.ok)throw Error();catalogue=await r.json();for(const key of Object.keys(catalogue.slots)){const o=make('option',labels[key]||key);o.value=key;category.append(o);}category.value=Object.keys(catalogue.slots)[0];category.onchange();status.textContent='Choose a song to start.';}catch(_){status.textContent='Could not load the collections. Reopen Garba Special to retry.';}};
 files.onchange=async()=>{files.disabled=true;let saved=0;try{await navigator.storage?.persist?.();for(const file of files.files){if(file.size>50000000||!(file.type.startsWith('audio/')||/\.(mp3|m4a|wav|ogg|flac)$/i.test(file.name)))continue;status.textContent='Saving '+file.name+'…';await bridge.importGarba(file);saved++;}status.textContent=saved+' files saved. Open saved Garba to use the DJ controls.';}catch(e){status.textContent=saved+' saved. '+e.message;}finally{files.disabled=false;files.value='';}};
 window.SaiVistaGarba={get active(){return !!desiredVideo;},get player(){return player;},get track(){return tracks[at];},get position(){return at;},get count(){return tracks.length;},toggle:()=>toggle.onclick(),next:()=>next.onclick(),previous:()=>play((at-1+tracks.length)%tracks.length),shuffle:()=>shuffle.onclick(),stop:()=>stop.onclick(),repeatOne:false};
 local.onclick=()=>{stop.onclick();bridge.openGarba();panel.hidden=true;};
})();
