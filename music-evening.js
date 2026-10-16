function tonightGroup(groups,day){return groups.find(g=>Number(g.day)===Number(day)&&g.songs?.length);}
function savedSongKey(group,song){return group+':'+song.id+':'+(song.size||0)+':'+(song.modifiedTime||song.modified||'');}
async function playlistReadiness(group,has){
 const result={saved:0,total:group?.songs?.length||0,missing:[]};
 for(const song of group?.songs||[])if(await has(savedSongKey(group.key,song)))result.saved++;else result.missing.push(song.name);
 return result;
}
if(typeof module!=='undefined')module.exports={tonightGroup,savedSongKey,playlistReadiness};
if(typeof document!=='undefined')(()=>{
 const bridge=window.SaiVistaStudioBridge,dialog=document.querySelector('.song-popup'),browse=dialog?.querySelector('.modern-browse');if(!bridge||!browse)return;
 const make=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 const box=make('section');box.className='evening-card';box.setAttribute('aria-label','Tonight at Sai Vista');
 const title=make('h3','Tonight at Sai Vista'),copy=make('p','One tap to play today’s planned playlist, in order.');
 const start=make('button','▶ Start tonight’s music');start.type='button';
 const queue=make('p');queue.className='evening-queue';queue.setAttribute('role','status');
 const check=make('button','Check offline readiness');check.type='button';
 const save=make('button','Save selected playlist');save.type='button';
 const progress=make('progress');progress.max=1;progress.value=0;progress.setAttribute('aria-label','Songs saved offline');
 const status=make('p','Choose a playlist to check your saved music.');status.setAttribute('role','status');
 const missing=make('details'),summary=make('summary','Songs still needed'),list=make('ul');missing.append(summary,list);missing.hidden=true;
 box.append(title,copy,start,queue,check,save,progress,status,missing);browse.before(box);
 let serial=0;
 async function inspect(){const token=++serial,group=bridge.group?{...bridge.group,songs:[...bridge.songs]}:null;check.disabled=true;status.textContent='Checking this device…';try{
  const result=await playlistReadiness(group,key=>window.SaiVistaOffline.has(key));if(token!==serial)return;
  progress.max=result.total||1;progress.value=result.saved;status.textContent=result.total?group.name+' · '+result.saved+' of '+result.total+' songs saved'+(result.saved===result.total?' · Ready offline.':' · Save the missing songs before going offline.'):'No songs in this playlist yet.';
  list.replaceChildren();for(const name of result.missing)list.append(make('li',name));missing.hidden=!result.missing.length;
 }catch(_){if(token===serial)status.textContent='Could not check browser storage. Offline readiness is unconfirmed.';}finally{if(token===serial)check.disabled=false;}}
 check.onclick=inspect;save.onclick=async()=>{const button=document.getElementById('songSaveDevice');if(button.disabled)return;save.disabled=true;try{await button.onclick();await inspect();}finally{save.disabled=false;}};
 start.onclick=async()=>{const day=window.NavratriDays?.current()?.day,group=tonightGroup(bridge.groups,day);if(!group){queue.textContent='Today’s playlist is not available yet. Choose a playlist in Daily songs.';return;}start.disabled=true;try{window.SaiVistaGarba?.stop();bridge.selectGroup(group.key);await bridge.startPlanned();await inspect();}finally{start.disabled=false;}};
 document.getElementById('songDay').addEventListener('change',inspect);window.addEventListener('sai-vista-player-open',inspect);
 const offline=dialog.querySelector('.modern-offline');if(offline){const hint=make('p','Use Check offline readiness above to see exactly which songs are saved on this device.');offline.prepend(hint);}
 const art=dialog.querySelector('.modern-art'),canvas=make('canvas');canvas.width=480;canvas.height=160;canvas.className='evening-spectrum';canvas.setAttribute('aria-hidden','true');art.append(canvas);
 const caption=art.querySelector('.modern-art-caption'),staticBars=art.querySelector('.modern-equalizer'),draw=canvas.getContext('2d');let analyser,output,bytes,lastQueue='';
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 function frame(){
  setTimeout(()=>requestAnimationFrame(frame),document.hidden||!dialog.open?700:80);
  if(document.hidden||!dialog.open)return;
  const online=window.SaiVistaGarba?.active,current=online?window.SaiVistaGarba.track?.title:bridge.dj.active?.song?.name,next=document.getElementById('songNextName').textContent;
  const text=current?'Now: '+current+(online?'': ' · '+next):'Ready for tonight’s planned music.';if(text!==lastQueue){queue.textContent=text;lastQueue=text;}
  const playing=!online&&bridge.dj.active&&!bridge.audio.paused,live=playing&&!reduced&&!!window.SaiVistaStudioOutput;
  canvas.hidden=!live;staticBars.hidden=!!live;caption.textContent=live?'LIVE · YOUR MUSIC IN MOTION':online?'LIVE VISUALS USE SAVED AUDIO':'RAAS · RANG · REPEAT';
  if(!live||!draw)return;
  try{if(output!==window.SaiVistaStudioOutput){if(output&&analyser)output.disconnect(analyser);output=window.SaiVistaStudioOutput;analyser=bridge.ctx.createAnalyser();analyser.fftSize=128;output.connect(analyser);bytes=new Uint8Array(analyser.frequencyBinCount);}
   analyser.getByteFrequencyData(bytes);draw.clearRect(0,0,480,160);draw.fillStyle='#d85b83';for(let i=0;i<32;i++){const h=Math.max(3,bytes[i*2]/255*155);draw.fillRect(i*15+3,160-h,9,h);}
  }catch(_){canvas.hidden=true;staticBars.hidden=false;caption.textContent='RAAS · RANG · REPEAT';}
 }
 requestAnimationFrame(frame);
})();
