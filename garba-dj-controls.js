// The same transport controls operate the active source. Audio processing stays in the local DJ engine.
(() => {
 const $=id=>document.getElementById(id),garba=()=>window.SaiVistaGarba;
 let cue=0,loopStart=null,loopEnd=null,lastTrack=null;
 const seek=t=>{const p=garba()?.player,d=p?.getDuration?.();if(d>0)p.seekTo(Math.max(0,Math.min(d,t)),true);};
 const current=()=>garba()?.player?.getCurrentTime?.()||0;
 function route(event){
  const g=garba();if(!g?.active)return;const el=event.target.closest?.('button,input,select');if(!el)return;
  const p=g.player,id=el.id;let action;
  if(event.type==='input'&&id==='songSeek')action=()=>seek(Number(el.value)/1000*(p.getDuration?.()||0));
  if(event.type==='input'&&id==='songVolume')action=()=>{p.setVolume?.(Number(el.value));$('songVolumeValue').textContent=el.value+'%';};
  if(event.type==='change'&&id==='songSpeed')action=()=>{const rate=Number(el.value),rates=p.getAvailablePlaybackRates?.()||[1];if(rates.includes(rate))p.setPlaybackRate(rate);else{$('songPlaybackStatus').textContent='This speed is unavailable for the online song.';el.value=String(p.getPlaybackRate?.()||1);}};
  if(event.type==='click'){
   const actions={songPlayPause:g.toggle,songNext:g.next,songPrevious:g.previous,songShuffle:g.shuffle,stopSong:()=>{g.stop();$('stopSong').onclick?.();},songRepeat:()=>{g.repeatOne=!g.repeatOne;el.textContent='Repeat: '+(g.repeatOne?'one':'all');},songMute:()=>{if(p.isMuted?.()){p.unMute();el.textContent='Mute';}else{p.mute?.();el.textContent='Unmute';}}};action=actions[id];
   if(!id){const label=el.textContent;action={'−10 seconds':()=>seek(current()-10),'+10 seconds':()=>seek(current()+10),'Set cue':()=>{cue=current();},'Go to cue':()=>seek(cue),'Loop start':()=>{loopStart=current();loopEnd=null;},'Loop end':()=>{if(loopStart!==null&&current()>loopStart+.5)loopEnd=current();},'Loop 8 seconds':()=>{loopStart=current();loopEnd=loopStart+8;},'Clear loop':()=>{loopStart=loopEnd=null;}}[label];}
  }
  if(action){event.preventDefault();event.stopImmediatePropagation();action();}
 }
 for(const type of ['click','input','change'])document.addEventListener(type,route,true);
 const fmt=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
 const timer=setInterval(()=>{const g=garba();if(!g?.active)return;const p=g.player;if(lastTrack!==g.track?.id){lastTrack=g.track?.id;cue=0;loopStart=loopEnd=null;}const time=current(),duration=p?.getDuration?.()||0;if(loopEnd!==null&&time>=loopEnd)seek(loopStart);$('songSeek').disabled=duration<=0;$('songSeek').value=duration?Math.round(time/duration*1000):0;$('songElapsed').textContent=fmt(time);$('songDuration').textContent=fmt(duration);$('songPlayPause').disabled=false;$('songNext').disabled=$('songPrevious').disabled=false;$('songPlayPause').textContent=p?.getPlayerState?.()===1?'Pause':'Play';$('songQueuePosition').textContent=(g.position+1)+' / '+g.count;$('songNextName').textContent='Garba Special · online playback';},500);timer.unref?.();
})();
