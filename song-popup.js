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
 section.append(title,note,open);dialog.append(close,content);document.body.append(dialog);
 const controls=content.querySelector('.player-controls');
 let cue=0,loopStart=null,loopEnd=null,current=null;
 const active=()=>[...content.querySelectorAll('audio')].find(a=>a.src && !a.paused)||[...content.querySelectorAll('audio')].find(a=>a.src);
 const status=document.createElement('p');status.textContent='Cue and loop controls apply to the current song.';
 const button=(label,action)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{const a=active();if(!a)return;if(current!==a){current=a;cue=0;loopStart=loopEnd=null;}action(a,b);};controls.append(b);return b;};
 button('Set cue',a=>{cue=a.currentTime;status.textContent='Cue saved at '+Math.floor(cue)+' seconds.';});
 button('Go to cue',a=>{a.currentTime=cue;});
 button('Loop start',a=>{loopStart=a.currentTime;loopEnd=null;a.saiVistaLoop=false;status.textContent='Loop start saved. Choose Loop end.';});
 button('Loop end',a=>{if(loopStart!==null&&a.currentTime>loopStart+.5){loopEnd=a.currentTime;a.saiVistaLoop=true;status.textContent='Loop active · '+(loopEnd-loopStart).toFixed(1)+' seconds.';}else status.textContent='Set the end at least half a second after the start.';});
 button('Clear loop',a=>{loopStart=loopEnd=null;a.saiVistaLoop=false;status.textContent='Loop cleared.';});controls.after(status);
 content.addEventListener('timeupdate',e=>{const a=e.target;if(a!==current){loopStart=loopEnd=null;return;}if(loopEnd!==null&&a.currentTime>=loopEnd)a.currentTime=loopStart;},true);
})();
