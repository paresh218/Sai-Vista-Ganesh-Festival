(() => {
 const $=id=>document.getElementById(id),section=$('navratriVideo');if(!section)return;
 const video=$('navratriVideoPlayer'),status=$('navratriVideoStatus'),ready=$('navratriVideoSave'),cancel=$('navratriVideoCancel'),compat=$('navratriVideoCompat'),progress=$('navratriVideoProgress'),pause=$('navratriVideoPause');
 let previewURL='',pending,activeId='',abort,version=0,busy=false,downloadFrame,downloadURL='',startupTimer,flow;
 const say=value=>status.textContent=value,core=window.PrivateVideoCore,access=()=>window.SaiVistaPrivateVideoAccess;
 function lock(value){busy=value;section.querySelectorAll('[data-video-action]').forEach(b=>b.disabled=value);document.documentElement.dataset.galleryDownloading=String(value);cancel.hidden=!value;if(!value){pause.hidden=true;pause.textContent='Pause download';pause.setAttribute('aria-pressed','false');}}
 function clear(){clearTimeout(startupTimer);compat.hidden=true;if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL='';version++;abort?.abort();if(activeId)navigator.serviceWorker?.controller?.postMessage({type:'private-video-cancel',id:activeId});activeId='';downloadFrame?.remove();video.pause();video.removeAttribute('src');video.load();video.hidden=true;$('navratriVideoCover').hidden=false;if(previewURL)URL.revokeObjectURL(previewURL);previewURL='';ready.hidden=true;ready.removeAttribute('href');progress.hidden=true;lock(false);}
 cancel.addEventListener('click',()=>{clear();say('Cancelled. You can restart the download when ready.');});
 window.addEventListener('sai-vista-private-signed-out',()=>{clear();say('The glimpse is public. Verify your email to download.');});
 window.addEventListener('storage',e=>{if(e.key==='saiVistaResidentFlat'||(e.key==='saiVistaPrivateGallery'&&!e.newValue)){clear();say('The glimpse is public. Verify your email to download.');}});
 async function verified(variant){const grant=await access().request({variant,videoOperation:variant==='preview'?'preview':'download'},abort.signal);const m=await core.manifest('assets/protected-video/20261025a/manifest.json',grant.manifestSha256);return {grant,m};}
 async function buffer(m,variant,k,current){pause.hidden=false;const parts=[];let received=0;for(let i=0;i<m.variants[variant].chunks.length;i++){if(current!==version)throw Error('Cancelled.');await flow.wait();const part=await core.chunk(m,variant,i,k,abort.signal,attempt=>say('Connection interrupted. Retrying ('+attempt+'/4)…'));await flow.wait();parts.push(part);received+=part.length;progress.value=received/m.variants[variant].bytes*100;say('Preparing '+Math.round(progress.value)+'%…');}return new Blob(parts,{type:'video/mp4'});}
 async function workerGrant(grant,variant,id){
  if(!navigator.serviceWorker?.controller)return null;
  return new Promise(resolve=>{const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(null);},5000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data.ok&&e.data.protocol===2?e.data.url:null);};navigator.serviceWorker.controller.postMessage({type:'private-video-grant',protocol:2,id,variant,...grant},[channel.port2]);});
 }
 async function run(variant,trigger,compatibility=false){
  if(variant==='preview'){video.src='assets/navratri-2026-glimpse.mp4';video.hidden=false;$('navratriVideoCover').hidden=true;video.muted=true;video.play().catch(()=>{if(!busy)say('Tap Play to watch the public glimpse. Your browser paused automatic playback.');});if(!busy)say('Public 15-second glimpse. Verify your email only to download the complete film.');return;}
  if(busy)return;lock(true);abort=new AbortController();flow=core.transfer(abort.signal);const current=++version;ready.hidden=true;progress.hidden=false;progress.value=0;say('Checking your verified email and logged-in flat…');
  try{
   const {grant,m}=await verified(variant);if(current!==version)return;
    activeId=crypto.randomUUID();const url=compatibility?null:await workerGrant(grant,variant,activeId);if(current!==version)return;
    if(url){downloadFrame?.remove();downloadFrame=document.createElement('iframe');downloadFrame.hidden=true;downloadFrame.name='private-video-'+activeId;downloadFrame.title='Private video download';document.body.append(downloadFrame);ready.href=url;ready.removeAttribute('download');ready.target=downloadFrame.name;ready.textContent='Save '+(variant==='original'?'original video':'Full HD video')+' · '+(m.variants[variant].bytes/1000000).toFixed(1)+' MB';ready.hidden=false;say('Ready. Tap Save to start the browser download. Progress will appear here.');}
    else{
     activeId='';if(variant==='original')throw Error('Refresh the page once to enable streaming downloads, or choose the smaller Full HD copy.');
     if(m.variants[variant].bytes>100000000)throw Error('This browser needs streaming download support. Try an updated browser.');
     const k=await core.key(grant.key),blob=await buffer(m,variant,k,current);if(current!==version)return;const url=URL.createObjectURL(blob);downloadURL=url;ready.href=url;ready.removeAttribute('target');ready.download=m.variants[variant].filename;ready.textContent='Save Full HD video';ready.hidden=false;pause.hidden=true;say('Ready. Tap Save. This browser prepares the smaller copy in memory.');setTimeout(()=>URL.revokeObjectURL(url),300000);
    }
  }catch(error){if(current!==version&&!/verify your email|sign in/i.test(error.message))return;progress.hidden=true;lock(false);if(/verify your email|sign in/i.test(error.message)){pending={variant,trigger,compatibility};say('Verify your email in the secure popup to continue.');access().verify(trigger);}else say(error.message||'The video could not be loaded. Please retry.');}
 }
 // Respect reduced-motion and data-saving preferences; browsers may still block autoplay.
 if('IntersectionObserver' in window&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&!navigator.connection?.saveData){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting&&e.intersectionRatio>=0.35)){observer.disconnect();if(!video.getAttribute('src'))run('preview');}},{threshold:0.35});observer.observe(video.parentElement);}
 section.querySelectorAll('[data-video-action]').forEach(button=>button.addEventListener('click',()=>run(button.dataset.videoAction,button)));
 ready.addEventListener('click',()=>{if(activeId){ready.hidden=true;pause.hidden=false;say('Download started. Keep this tab open; your browser controls where the file is saved.');clearTimeout(startupTimer);startupTimer=setTimeout(()=>{if(activeId&&progress.value===0){compat.hidden=false;say('If your download has not started, try the compatibility copy below.');}},10000);}else{lock(false);say('Save started in your browser. Check Downloads for the video.');}});
 pause.addEventListener('click',()=>{if(!busy)return;const paused=pause.getAttribute('aria-pressed')!=='true';flow[paused?'pause':'resume']();if(activeId)navigator.serviceWorker?.controller?.postMessage({type:paused?'private-video-pause':'private-video-resume',id:activeId});pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Resume download':'Pause download';say(paused?'Paused. Up to one current chunk may finish; keep this tab open.':'Resuming download…');});
  compat.addEventListener('click',()=>{clear();run('optimised',compat,true);});
 window.addEventListener('sai-vista-video-verified',()=>{const next=pending;pending=null;if(next)run(next.variant,next.trigger,next.compatibility);});
 navigator.serviceWorker?.addEventListener('message',event=>{const d=event.data;if(d?.type!=='private-video-progress'||d.id!==activeId)return;
  if(d.state==='retrying'){say('Connection interrupted. Retrying ('+d.attempt+'/4)…');return;}
  if(d.state==='progress'){clearTimeout(startupTimer);compat.hidden=true;progress.value=d.received/d.total*100;if(pause.getAttribute('aria-pressed')!=='true')say('Downloading '+Math.round(progress.value)+'% · '+(d.received/1000000).toFixed(1)+' of '+(d.total/1000000).toFixed(1)+' MB');}
  else{clearTimeout(startupTimer);compat.hidden=d.state==='complete';activeId='';lock(false);say(d.state==='complete'?'Video data delivered to your browser. Check Downloads for the saved file.':d.state==='cancelled'?'Download cancelled.':'Download interrupted. Please retry.');}
 });
})();
