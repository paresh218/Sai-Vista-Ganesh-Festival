function miniPlaybackState(dj){
 const decks=[dj?.active,dj?.outgoing].filter(d=>d?.audio?.src),playing=decks.filter(d=>!d.audio.paused&&!d.audio.ended);
 if(!decks.length)return null;
 return{title:(playing.length?playing:decks).map(d=>d.song?.name||'Sai Vista song').join(' + '),playing:playing.length>0,status:playing.length?(playing.length>1?'Mixing':'Playing')+(dj.muted?' · muted':dj.volume===0?' · volume 0%':''):'Paused'};
}
if(typeof module!=='undefined')module.exports=miniPlaybackState;
if(typeof document!=='undefined')(()=>{
 const bar=document.createElement('aside');bar.className='song-mini';bar.setAttribute('aria-label','Current music playback');bar.hidden=true;
 const info=document.createElement('div'),badge=document.createElement('strong'),title=document.createElement('span'),toggle=document.createElement('button'),open=document.createElement('button'),stop=document.createElement('button');
 badge.setAttribute('role','status');title.className='song-mini-title';toggle.type=open.type=stop.type='button';open.textContent='Open player';stop.textContent='Stop';info.append(badge,title);bar.append(info,toggle,open,stop);document.body.append(bar);
 const dialog=document.querySelector('.song-popup'),bridge=()=>window.SaiVistaStudioBridge;
 const set=(el,value)=>{if(el.textContent!==value)el.textContent=value;};
 function update(){const state=miniPlaybackState(bridge()?.dj);bar.hidden=!state||!!dialog?.open;document.body.classList.toggle('has-song-mini',!bar.hidden);if(!state)return;set(badge,'♫ '+state.status);set(title,state.title);set(toggle,state.playing?'Pause':'Resume');}
 toggle.onclick=async()=>{const b=bridge();if(!b)return;const state=miniPlaybackState(b.dj);if(state?.playing)b.dj.pause();else if(b.dj.active){await b.sound(b.dj.active.audio);b.dj.active.audio.play().catch(()=>{});}update();};
 open.onclick=()=>{dialog?.showModal();update();};stop.onclick=()=>{document.getElementById('stopSong').click();update();};dialog?.addEventListener('close',update);
 for(const event of ['play','pause','ended','emptied'])document.addEventListener(event,update,true);
 setInterval(update,500);update();
})();
