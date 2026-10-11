const PlaylistTime={
 key:s=>s.id+':'+(s.size||0),
 summary(songs,durations){const known=songs.map(s=>durations[this.key(s)]).filter(n=>Number.isFinite(n)&&n>0);const seconds=Math.round(known.reduce((a,b)=>a+b,0));const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return{known:known.length,total:songs.length,text:(h?h+'h ':'')+m+'m '+s+'s'};},
 async measure(blob){const audio=document.createElement('audio'),url=URL.createObjectURL(blob);return new Promise(resolve=>{let timer;const finish=()=>{clearTimeout(timer);const n=audio.duration;audio.onloadedmetadata=audio.onerror=null;audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);resolve(Number.isFinite(n)&&n>0?n:null);};audio.preload='metadata';audio.onloadedmetadata=audio.onerror=finish;timer=setTimeout(finish,10000);audio.src=url;if(Number.isFinite(audio.duration)&&audio.duration>0)finish();});}
};
if(typeof window!=='undefined')window.PlaylistTime=PlaylistTime;
if(typeof module!=='undefined')module.exports=PlaylistTime;
