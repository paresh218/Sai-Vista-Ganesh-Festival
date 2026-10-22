(() => {
  const dialog=document.getElementById('privateGallery'),auth=document.getElementById('galleryAuth'),otpForm=document.getElementById('galleryOtpForm'),album=document.getElementById('galleryAlbum'),status=document.getElementById('galleryStatus');
  if(!dialog)return;
  const $=id=>document.getElementById(id),endpoint=()=>window.SaiVistaGalleryConfig?.endpoint;
  let token='',email='',expires=0,challenge='',page=0,total=0,photos=[],selected=0,mode='grid',opener,slideTimer,version=0,viewVersion=0,urls=new Set(),previewCache=new Map();
  const device=()=>({userAgent:navigator.userAgent.slice(0,300),language:navigator.language,viewport:innerWidth+'×'+innerHeight,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});
  const say=message=>status.textContent=message;
  const residentFlat=()=>{try{return ResidentAccess.remembered(localStorage)||'';}catch(_){return '';}};
  const cache=window.SaiVistaGalleryCache,owner=()=>email+'|'+residentFlat();
  let resendAt=0,resendTimer,activeRequests=0;const requestWaiters=[];
  async function slot(run){if(activeRequests>=2)await new Promise(resolve=>requestWaiters.push(resolve));else activeRequests++;try{return await run();}finally{const next=requestWaiters.shift();if(next)next();else activeRequests--;}}
  async function media(kind,photo){const expected=token,scope=owner(),saved=await cache?.get(scope,kind,photo);if(saved){await api('gallery-cache',{photo,download:kind==='download'});if(token!==expected)throw Error('Sign in again.');return saved;}const image=await api('gallery-'+kind,{photo});if(token!==expected)throw Error('Sign in again.');await cache?.put(scope,kind,photo,image);return image;}
  function resendCountdown(){clearInterval(resendTimer);const tick=()=>{const seconds=Math.max(0,Math.ceil((resendAt-Date.now())/1000));$('galleryResend').disabled=seconds>0;$('galleryResend').textContent=seconds?'Resend code in '+seconds+'s':'Resend code';if(!seconds)clearInterval(resendTimer);};tick();resendTimer=setInterval(tick,1000);}
  const setBusy=(form,busy)=>{for(const field of form.elements)field.disabled=busy;form.setAttribute('aria-busy',String(busy));};
  function remember(){try{localStorage.setItem('saiVistaPrivateGallery',JSON.stringify({token,email,flat:residentFlat(),expires}));}catch(_){/* A memory-only session still works when browser storage is blocked. */}}
  function clearImages(){urls.forEach(URL.revokeObjectURL);urls.clear();previewCache.clear();$('galleryGrid').replaceChildren();$('galleryPhoto').removeAttribute('src');}
  function signedOut(){stopSlideshow();version++;viewVersion++;token='';email='';expires=0;clearImages();cache?.clear();try{localStorage.removeItem('saiVistaPrivateGallery');}catch(_){}auth.hidden=false;otpForm.hidden=true;album.hidden=true;$('galleryLogout').hidden=true;$('galleryIdentity').textContent='Private access · verified email';}
  async function api(action,fields={}){
    if(!endpoint())throw Error('The private photo gallery is being connected. Please try again later.');
    const body=new URLSearchParams({payload:JSON.stringify({action,token,flat:residentFlat(),device:device(),requestId:crypto.randomUUID(),mode,...fields})});
    return slot(async()=>{for(let attempt=0;attempt<3;attempt++){
      let response,data;try{response=await fetch(endpoint(),{method:'POST',body,cache:'no-store',signal:AbortSignal.timeout(90000)});data=await response.json();}catch(error){if(attempt<2&&/^gallery-(page|thumbs|image|download|cache|status)$/.test(action)){await new Promise(r=>setTimeout(r,500*2**attempt+Math.random()*500));continue;}throw Error('The gallery is busy or offline. Please try again.');}
      if(data.reauthenticate===true){signedOut();say(data.error||'Sign in again.');}
      if(!response.ok||data.ok!==true)throw Error(data.error||'Could not connect to the private gallery. Please try again.');return data;
    }});
  }
  const report=(event,photo=photos[selected]?.id)=>{if(photo&&token)api('gallery-event',{event,photo}).catch(()=>say('Activity recording could not be confirmed. Please reconnect before continuing.'));};
  function imageUrl(image){if(!/^image\/(jpeg|png|webp)$/.test(image.mime)||typeof image.base64!=='string')throw Error('This image could not be loaded.');const binary=atob(image.base64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:image.mime}));urls.add(url);return url;}
  function stopSlideshow(){clearTimeout(slideTimer);slideTimer=null;$('gallerySlideshow').textContent='Start slideshow';$('gallerySlideshow').setAttribute('aria-pressed','false');}
  function panels(state){auth.hidden=state!=='auth';otpForm.hidden=state!=='otp';album.hidden=state!=='album';}
  function identity(){ $('galleryIdentity').textContent='Signed in as '+email;$('galleryLogout').hidden=false; }
  async function openAlbum(){await loadPage(0);}
  $('openPrivateGallery').addEventListener('click',async event=>{
    opener=event.currentTarget;dialog.showModal();say('');$('galleryFlat').value=residentFlat();$('galleryFlat').readOnly=Boolean(residentFlat());if(!residentFlat()){say('Please enter your flat on the main site first.');return;}
    if(!token){try{const saved=JSON.parse(localStorage.getItem('saiVistaPrivateGallery')||'null');if(saved&&typeof saved.token==='string'&&saved.expires>Date.now()&&saved.flat===residentFlat()){token=saved.token;email=saved.email;expires=saved.expires;}}catch(_){} }
    if(token){say('Checking your private gallery access…');try{await openAlbum();}catch(error){signedOut();say(error.message);}}else{panels('auth');$('galleryEmail').focus();}
  });
  $('closePrivateGallery').addEventListener('click',()=>dialog.close());
  window.addEventListener('storage',event=>{if(event.key==='saiVistaResidentFlat'||event.key==='saiVistaPrivateGallery'){signedOut();if(dialog.open)dialog.close();}});
  dialog.addEventListener('close',()=>{clearInterval(resendTimer);stopSlideshow();version++;viewVersion++;clearImages();opener?.focus();});
  $('galleryRequestForm').addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;
    setBusy(form,true);say('Sending your email verification code…');
    try{const result=await api('gallery-otp',{email:$('galleryEmail').value.trim(),name:$('galleryName').value.trim(),flat:$('galleryFlat').value.trim().toUpperCase().replace(' ','-').replace(/^([A-F])(\d)/,'$1-$2'),consent:$('galleryConsent').checked});challenge=result.challenge;resendAt=Date.now()+30000;resendCountdown();panels('otp');say(result.message);$('galleryCode').focus();}catch(error){say(error.message);}finally{setBusy(form,false);}
  });
  otpForm.addEventListener('submit',async event=>{
    event.preventDefault();if(!otpForm.reportValidity())return;setBusy(otpForm,true);say('Verifying your email…');
    try{const result=await api('gallery-verify',{challenge,code:$('galleryCode').value});token=result.token;email=result.email;expires=result.expires;remember();identity();$('galleryCode').value='';await openAlbum();}catch(error){say(error.message);}finally{setBusy(otpForm,false);}
  });
  $('galleryResend').addEventListener('click',()=>{if(Date.now()<resendAt)return;$('galleryRequestForm').dispatchEvent(new Event('submit',{cancelable:true}));});
  $('galleryOtherEmail').addEventListener('click',()=>{panels('auth');say('');$('galleryEmail').focus();});
  $('galleryLogout').addEventListener('click',async()=>{const oldToken=token;signedOut();say('Signed out. Photos have been cleared from this page.');if(oldToken)try{await api('gallery-logout',{token:oldToken});}catch(_){/* The local bearer token is removed even if logout is offline. Server sessions also expire. */}});
  async function loadPage(nextPage){
    stopSlideshow();const current=++version;viewVersion++;clearImages();$('galleryStage').hidden=true;$('galleryGrid').hidden=false;say('Loading the album…');
    try{
      const result=await api('gallery-page',{page:nextPage});if(current!==version||!token)return;email=result.email||email;expires=result.expires||expires;identity();remember();panels('album');
      page=result.page;total=result.total;photos=result.photos;selected=0;
      $('galleryPageLabel').textContent=total?`${page*24+1}–${Math.min((page+1)*24,total)} of ${total} photos`:'No photos are available yet.';
      $('galleryPreviousPage').disabled=page===0;$('galleryNextPage').disabled=(page+1)*24>=total;
      $('galleryGrid').className='private-gallery-grid '+(mode==='list'?'private-gallery-list':'');
      for(const [index,photo] of photos.entries()){
        const button=document.createElement('button');button.type='button';button.className='private-photo-card';button.setAttribute('aria-label','Open photo '+photo.number);
        const img=document.createElement('img');img.alt='Navratri celebration photo '+photo.number;img.width=320;img.height=240;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
        const label=document.createElement('span');label.textContent='Photo '+photo.number;button.append(img,label);button.onclick=()=>openPhoto(index);$('galleryGrid').append(button);
      }
      say('Loading lightweight previews…');
      // Six images per request keeps initial payloads small and avoids fetching full-resolution originals.
      const missing=[];await Promise.all(photos.map(async(photo,index)=>{const saved=await cache?.get(owner(),'thumb',photo.id);if(current!==version||!token)return;if(saved)$('galleryGrid').children[index].querySelector('img').src=imageUrl(saved);else missing.push(photo);}));
      let offset=0;const worker=async()=>{while(offset<missing.length){const batch=missing.slice(offset,offset+=6);if(current!==version||!token)return;const reply=await api('gallery-thumbs',{ids:batch.map(p=>p.id)});if(current!==version||!token)return;for(const item of reply.images){const i=photos.findIndex(p=>p.id===item.id);if(i>=0&&!item.error){$('galleryGrid').children[i].querySelector('img').src=imageUrl(item);await cache?.put(owner(),'thumb',item.id,item);}}}};await Promise.all([worker(),worker()]);
      if(current===version)say('Choose a photo to view or download. Only watermarked downloads are offered.');
    }catch(error){if(current===version)say(error.message);}
  }
  async function openPhoto(index){
    if(index<0||index>=photos.length)return;const current=++viewVersion;selected=index;$('galleryGrid').hidden=true;$('galleryStage').hidden=false;$('galleryPhoto').removeAttribute('src');$('galleryPhotoLabel').textContent='Photo '+photos[index].number+' of '+total;$('galleryPreviousPhoto').disabled=page===0&&index===0;$('galleryNextPhoto').disabled=page*24+index+1>=total;$('galleryDownload').disabled=true;say('Loading photo…');
    try{
      const photo=photos[index];let url=previewCache.get(photo.id);
      if(url){const access=await api('gallery-status');if(access.status!=='APPROVED'){signedOut();throw Error('Verify your email again.');}}
      if(!url){const result=await media('image',photo.id);if(current!==viewVersion||!token)return;url=imageUrl(result);previewCache.set(photo.id,url);}
      $('galleryPhoto').src=url;await $('galleryPhoto').decode();if(current!==viewVersion||!token)return;
      $('galleryDownload').disabled=false;say('');report('photo_displayed',photo.id);
      if(slideTimer)slideTimer=setTimeout(()=>movePhoto(1),6000);
    }catch(error){if(current===viewVersion)say(error.message);stopSlideshow();}
  }
  async function movePhoto(direction){
    const next=selected+direction;
    if(next>=0&&next<photos.length){await openPhoto(next);return;}
    const nextPage=page+direction;if(nextPage<0||nextPage*24>=total){stopSlideshow();return;}
    const wasPlaying=Boolean(slideTimer);await loadPage(nextPage);if(wasPlaying){slideTimer=1;$('gallerySlideshow').textContent='Pause slideshow';$('gallerySlideshow').setAttribute('aria-pressed','true');}await openPhoto(direction>0?0:photos.length-1);
  }
  $('galleryPreviousPhoto').onclick=()=>{stopSlideshow();movePhoto(-1);};$('galleryNextPhoto').onclick=()=>{stopSlideshow();movePhoto(1);};
  $('galleryBack').onclick=()=>{stopSlideshow();viewVersion++;$('galleryStage').hidden=true;$('galleryGrid').hidden=false;say('');};
  $('galleryPreviousPage').onclick=()=>loadPage(page-1);$('galleryNextPage').onclick=()=>loadPage(page+1);
  for(const view of ['grid','list'])$('galleryMode'+view).onclick=()=>{mode=view;$('galleryGrid').classList.toggle('private-gallery-list',view==='list');$('galleryModegrid').setAttribute('aria-pressed',String(view==='grid'));$('galleryModelist').setAttribute('aria-pressed',String(view==='list'));report('view_mode');};
  $('gallerySlideshow').onclick=async()=>{if(slideTimer){stopSlideshow();report('slideshow_stopped');return;}if(!photos.length)return;slideTimer=1;$('gallerySlideshow').textContent='Pause slideshow';$('gallerySlideshow').setAttribute('aria-pressed','true');report('slideshow_started');await openPhoto(selected);};
  dialog.addEventListener('keydown',event=>{if(/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)||$('galleryStage').hidden)return;if(event.key==='ArrowRight'){event.preventDefault();stopSlideshow();movePhoto(1);}if(event.key==='ArrowLeft'){event.preventDefault();stopSlideshow();movePhoto(-1);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSlideshow();});
  $('galleryDownload').onclick=async()=>{
    const button=$('galleryDownload'),photo=photos[selected];if(!photo)return;stopSlideshow();button.disabled=true;say('Preparing your watermarked photo…');
    try{
      const result=await media('download',photo.id),url=imageUrl(result),img=new Image();img.src=url;await img.decode();
      const ratio=Math.min(1,2560/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*ratio);canvas.height=Math.round(img.naturalHeight*ratio);const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image export is unavailable in this browser.');ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const size=Math.max(12,Math.round(canvas.width*.017)),pad=Math.max(12,Math.round(canvas.width*.015)),text='Sai Vista Navratri 2026';ctx.font=`600 ${size}px sans-serif`;const width=ctx.measureText(text).width;ctx.fillStyle='rgba(35,15,31,.66)';ctx.fillRect(canvas.width-width-pad*2,canvas.height-size-pad*2,width+pad*2,size+pad*2);ctx.fillStyle='#fff6df';ctx.textBaseline='bottom';ctx.fillText(text,canvas.width-width-pad,canvas.height-pad);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));if(!blob)throw Error('Could not prepare the image.');if(!token)throw Error('Please sign in again.');
      const downloadUrl=URL.createObjectURL(blob),a=document.createElement('a');a.href=downloadUrl;a.download='Sai-Vista-Navratri-2026-Photo-'+photo.number+'.jpg';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(downloadUrl),10000);report('download_prepared',photo.id);say('Watermarked download prepared. Your download request was recorded.');
    }catch(error){report('download_failed',photo.id);say(error.message);}finally{button.disabled=false;}
  };
})();
