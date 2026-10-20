from pathlib import Path
p=Path('navratri-songs.js');s=p.read_text(encoding='utf-8')
s=s.replace('ctx=new AC();bands=',"ctx=new AC();ctx.onstatechange=restoreAudio;bands=")
s=s.replace("$('songSeek').value=audio.duration?Math.round(audio.currentTime/audio.duration*1000):0;}","$('songSeek').value=Number.isFinite(audio.duration)&&audio.duration>0?Math.round(audio.currentTime/audio.duration*1000):0;$('songSeek').style?.setProperty('--seek-progress',Math.max(0,Math.min(100,Number($('songSeek').value)/10))+'%');}")
s=s.replace("loading=true;const token=++generation;", "void sound();loading=true;const token=++generation;")
s=s.replace("audio.onplaying=()=>{position();", "audio.onplaying=()=>{restoreAudio();position();")
s=s.replace("if(ctx&&ctx.state&&ctx.state!=='running'){$('songPlaybackStatus')", "if(ctx&&ctx.state&&ctx.state!=='running'){restoreAudio();$('songPlaybackStatus')")
s=s.replace("audio.currentTime=Number($('songSeek').value)/1000*audio.duration;};", "audio.currentTime=Number($('songSeek').value)/1000*audio.duration;position();};")
old="const restoreAudio=()=>{if(!audio.paused&&ctx?.state==='suspended')ctx.resume().catch(()=>{$('songPlaybackStatus').textContent='Press Play to resume audio.';});};"
new="""let restoringAudio=false,recoveryRetryAfter=0;
 function restoreAudio(){
   // A playing media element can become silent when its Web Audio output is interrupted.
   if(audio.paused||audio.ended||window.SaiVistaGarba?.active||!ctx||!['suspended','interrupted'].includes(ctx.state)||restoringAudio||Date.now()<recoveryRetryAfter)return;
   restoringAudio=true;
   Promise.resolve().then(()=>ctx.resume()).then(()=>{
     recoveryRetryAfter=ctx.state==='running'?0:Date.now()+5000;
     if(!audio.paused&&ctx.state==='running'){$('songPlayPause').textContent='Pause';$('songPlaybackStatus').textContent=dj.outgoing?'Crossfading…':'Playing';}
   }).catch(()=>{recoveryRetryAfter=Date.now()+5000;$('songPlaybackStatus').textContent='Press Play to resume audio.';$('songPlayPause').textContent='Resume';}).finally(()=>{restoringAudio=false;});
 }"""
assert old in s;s=s.replace(old,new);p.write_text(s,encoding='utf-8')
p=Path('garba-dj-controls.js');s=p.read_text(encoding='utf-8');s=s.replace("$('songElapsed').textContent=fmt(time);", "$('songSeek').style?.setProperty('--seek-progress',Math.max(0,Math.min(100,Number($('songSeek').value)/10))+'%');$('songElapsed').textContent=fmt(time);")
s=s.replace("p.seekTo(Math.max(0,Math.min(d,t)),true);", "{const target=Math.max(0,Math.min(d,t));p.seekTo(target,true);$('songSeek').style?.setProperty('--seek-progress',target/d*100+'%');}")
p.write_text(s,encoding='utf-8')
p=Path('player-modern.css');s=p.read_text(encoding='utf-8');s+='''
/* Pink is played; the light grey section is still to come. */
.modern-player #songSeek{--seek-progress:0%;--seek-played:#ff6094;--seek-remaining:#85869b}
.modern-player #songSeek::-webkit-slider-runnable-track{background:linear-gradient(to right,var(--seek-played) 0%,var(--seek-played) var(--seek-progress),var(--seek-remaining) var(--seek-progress),var(--seek-remaining) 100%);box-shadow:none;height:8px}
.modern-player #songSeek::-moz-range-track{background:linear-gradient(to right,var(--seek-played) 0%,var(--seek-played) var(--seek-progress),var(--seek-remaining) var(--seek-progress),var(--seek-remaining) 100%);box-shadow:none;height:8px}
.modern-player #songSeek::-webkit-slider-thumb{background:#ff6094;border-color:#f8e8f0}
.modern-player #songSeek::-moz-range-thumb{background:#ff6094;border-color:#f8e8f0}
.modern-player .song-time span:first-child::after{content:' played';color:#ff91b4}
.modern-player .song-time span:last-child::before{content:'Total ';color:#c6c6d4}
''';p.write_text(s,encoding='utf-8')
