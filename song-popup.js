// Keep one player instance alive while its popup is closed.
(() => {
 const section=document.getElementById('navratriSongs');
 const dialog=document.createElement('dialog');dialog.className='song-popup';dialog.setAttribute('aria-label','Sai Vista DJ player');
 const close=document.createElement('button');close.type='button';close.className='btn btn-outline';close.textContent='Minimise player';close.onclick=()=>dialog.close();
 const content=document.createElement('div');
 for(const child of [...section.children])content.append(child);
 const open=document.createElement('button');open.type='button';open.className='btn btn-dark';open.textContent='Open DJ player ♫';open.onclick=()=>dialog.showModal();
 const title=document.createElement('h2');title.textContent='Navratri Songs for Sai Vista';title.id='navratriSongsTitle';
 content.querySelector('#navratriSongsTitle').removeAttribute('id');
 const note=document.createElement('p');note.textContent='Open your playlist and DJ controls. Music continues when you minimise the player.';
 const preview=document.createElement('div');preview.className='dj-preview';preview.innerHTML='<div class="dj-preview-copy"><span class="player-eyebrow">SAI VISTA · LIVE DJ PLAYER</span><h3>Your Garba. Your mix.</h3><p>Day-wise playlists · seamless crossfade · bass &amp; treble · cue &amp; loops</p><strong class="dj-preview-track">Choose your first track</strong></div><div class="dj-preview-art" aria-hidden="true"><div class="dj-disc"></div><div class="dj-bars">▂ ▅ ▃ ▇ ▄ ▆ ▂ ▅ ▇ ▃ ▆ ▄</div></div>';preview.append(open);section.append(title,preview,note);
 const header=document.createElement('div');header.className='dj-popup-header';const label=document.createElement('strong');label.textContent='SAI VISTA / DJ STUDIO';const expand=document.createElement('button');expand.type='button';expand.className='btn btn-outline';expand.textContent='Expand player';expand.onclick=()=>{const wide=dialog.className.includes('is-expanded');dialog.className=wide?'song-popup':'song-popup is-expanded';expand.textContent=wide?'Expand player':'Compact view';};header.append(label,expand,close);content.className='dj-popup-content';dialog.append(header,content);document.body.append(dialog);
 const now=content.querySelector('#songNowPlaying'),track=preview.querySelector('.dj-preview-track');if(now&&track&&typeof MutationObserver!=='undefined')new MutationObserver(()=>{if(track.textContent!==now.textContent)track.textContent=now.textContent;}).observe(now,{childList:true,subtree:true,characterData:true});
 const controls=content.querySelector('.player-controls');
 let cue=0,loopStart=null,loopEnd=null,current=null;
 const active=()=>[...content.querySelectorAll('audio')].find(a=>a.src && !a.paused)||[...content.querySelectorAll('audio')].find(a=>a.src);
 const status=document.createElement('p');status.textContent='Cue and loop controls apply to the current song.';
 const button=(label,action)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{const a=active();if(!a)return;if(current!==a){current=a;cue=0;loopStart=loopEnd=null;}action(a,b);};controls.append(b);return b;};
 button('−10 seconds',a=>{a.currentTime=Math.max(0,a.currentTime-10);});
 button('+10 seconds',a=>{if(Number.isFinite(a.duration))a.currentTime=Math.min(a.duration,a.currentTime+10);});
 button('Loop 8 seconds',a=>{if(Number.isFinite(a.duration)&&a.duration-a.currentTime>=8){loopStart=a.currentTime;loopEnd=loopStart+8;a.saiVistaLoop=true;status.textContent='8-second loop active.';}});
 button('Set cue',a=>{cue=a.currentTime;status.textContent='Cue saved at '+Math.floor(cue)+' seconds.';});
 button('Go to cue',a=>{a.currentTime=cue;});
 button('Loop start',a=>{loopStart=a.currentTime;loopEnd=null;a.saiVistaLoop=false;status.textContent='Loop start saved. Choose Loop end.';});
 button('Loop end',a=>{if(loopStart!==null&&a.currentTime>loopStart+.5){loopEnd=a.currentTime;a.saiVistaLoop=true;status.textContent='Loop active · '+(loopEnd-loopStart).toFixed(1)+' seconds.';}else status.textContent='Set the end at least half a second after the start.';});
 button('Clear loop',a=>{loopStart=loopEnd=null;a.saiVistaLoop=false;status.textContent='Loop cleared.';});controls.after(status);
 content.addEventListener('timeupdate',e=>{const a=e.target;if(a!==current){loopStart=loopEnd=null;return;}if(loopEnd!==null&&a.currentTime>=loopEnd)a.currentTime=loopStart;},true);
})();
