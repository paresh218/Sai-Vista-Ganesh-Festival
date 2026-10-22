(() => {
  const dialog=document.getElementById('privateGallery'),auth=document.getElementById('galleryAuth'),otpForm=document.getElementById('galleryOtpForm'),pending=document.getElementById('galleryPending'),album=document.getElementById('galleryAlbum'),status=document.getElementById('galleryStatus');
  if(!dialog)return;
  const $=id=>document.getElementById(id),endpoint=()=>window.SaiVistaRegistrationConfig?.endpoint;
  let token='',email='',expires=0,challenge='',page=0,total=0,photos=[],selected=0,mode='grid',opener,slideTimer,version=0,viewVersion=0,urls=new Set(),previewCache=new Map();
  const device=()=>({userAgent:navigator.userAgent.slice(0,300),language:navigator.language,viewport:innerWidth+'×'+innerHeight,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});
  const say=message=>status.textContent=message;
  const setBusy=(form,busy)=>{for(const field of form.elements)field.disabled=busy;form.setAttribute('aria-busy',String(busy));};
  function remember(){try{sessionStorage.setItem('saiVistaPrivateGallery',JSON.stringify({token,email,expires}));}catch(_){/* A memory-only session still works when browser storage is blocked. */}}
  function clearImages(){urls.forEach(URL.revokeObjectURL);urls.clear();previewCache.clear();$('galleryGrid').replaceChildren();$('galleryPhoto').removeAttribute('src');}
  function signedOut(){stopSlideshow();version++;viewVersion++;token='';email='';expires=0;clearImages();try{sessionStorage.removeItem('saiVistaPrivateGallery');}catch(_){}auth.hidden=false;otpForm.hidden=true;pending.hidden=true;album.hidden=true;$('galleryLogout').hidden=true;$('galleryIdentity').textContent='Private access · verified email and committee approval';}
  async function api(action,fields={}){
    if(!endpoint())throw Error('The private photo gallery is being connected. Please try again later.');
    const response=await fetch(endpoint(),{method:'POST',body:new URLSearchParams({payload:JSON.stringify({action,token,device:device(),requestId:crypto.randomUUID(),mode,...fields})}),cache:'no-store',signal:AbortSignal.timeout(90000)});
    const data=await response.json();if(data.reauthenticate===true){signedOut();say(data.error||'Sign in again.');}if(!response.ok||data.ok!==true)throw Error(data.error||'Could not connect to the private gallery. Please try again.');return data;
  }
  const report=(event,photo=photos[selected]?.id)=>{if(photo&&token)api('gallery-event',{event,photo}).catch(()=>say('Activity recording could not be confirmed. Please reconnect before continuing.'));};
  function imageUrl(image){if(!/^image\/(jpeg|png|webp)$/.test(image.mime)||typeof image.base64!=='string')throw Error('This image could not be loaded.');const binary=atob(image.base64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:image.mime}));urls.add(url);return url;}
  function stopSlideshow(){clearTimeout(slideTimer);slideTimer=null;$('gallerySlideshow').textContent='Start slideshow';$('gallerySlideshow').setAttribute('aria-pressed','false');}
  function panels(state){auth.hidden=state!=='auth';otpForm.hidden=state!=='otp';pending.hidden=state!=='pending';album.hidden=state!=='album';}
  function identity(){ $('galleryIdentity').textContent='Signed in as '+email;$('galleryLogout').hidden=false; }
  async function checkApproval(){const result=await api('gallery-status');email=result.email;expires=result.expires;identity();remember();if(result.status==='APPROVED'){panels('album');await loadPage(0);}else{panels('pending');$('galleryPendingEmail').textContent=email;say('Your email is verified. The Cultural Committee must approve your request before you can see photos.');}}
  $('openPrivateGallery').addEventListener('click',async event=>{
    opener=event.currentTarget;dialog.showModal();say('');
    if(!token){try{const saved=JSON.parse(sessionStorage.getItem('saiVistaPrivateGallery')||'null');if(saved&&typeof saved.token==='string'&&saved.expires>Date.now()){token=saved.token;email=saved.email;expires=saved.expires;}}catch(_){} }
    if(token){say('Checking your private gallery access…');try{await checkApproval();}catch(error){signedOut();say(error.message);}}else{panels('auth');$('galleryEmail').focus();}
  });
  $('closePrivateGallery').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{stopSlideshow();version++;viewVersion++;clearImages();opener?.focus();});
  $('galleryRequestForm').addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;
    setBusy(form,true);say('Sending your email verification code…');
    try{const result=await api('gallery-otp',{email:$('galleryEmail').value.trim(),name:$('galleryName').value.trim(),flat:$('galleryFlat').value.trim().toUpperCase().replace(' ','-').replace(/^([A-F])(\d)/,'$1-$2'),consent:$('galleryConsent').checked});challenge=result.challenge;panels('otp');say(result.message);$('galleryCode').focus();}catch(error){say(error.message);}finally{setBusy(form,false);}
  });
  otpForm.addEventListener('submit',async event=>{
    event.preventDefault();if(!otpForm.reportValidity())return;setBusy(otpForm,true);say('Verifying your email…');
    try{const result=await api('gallery-verify',{challenge,code:$('galleryCode').value});token=result.token;email=result.email;expires=result.expires;remember();identity();$('galleryCode').value='';await checkApproval();}catch(error){say(error.message);}finally{setBusy(otpForm,false);}
  });
  $('galleryOtherEmail').addEventListener('click',()=>{panels('auth');say('');$('galleryEmail').focus();});
  $('galleryCheckApproval').addEventListener('click',async()=>{say('Checking committee approval…');try{await checkApproval();}catch(error){say(error.message);}});
  $('galleryLogout').addEventListener('click',async()=>{const oldToken=token;signedOut();say('Signed out. Photos have been cleared from this page.');if(oldToken)try{await api('gallery-logout',{token:oldToken});}catch(_){/* The local bearer token is removed even if logout is offline. Server sessions also expire. */}});
  async function loadPage(nextPage){
    stopSlideshow();const current=++version;viewVersion++;clearImages();$('galleryStage').hidden=true;$('galleryGrid').hidden=false;say('Loading the album…');
    try{
      const result=await api('gallery-page',{page:nextPage});if(current!==version)return;
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
      for(let offset=0;offset<photos.length;offset+=6){
        if(current!==version||!token)return;
        const batch=photos.slice(offset,offset+6),reply=await api('gallery-thumbs',{ids:batch.map(p=>p.id)});
        if(current!==version||!token)return;
        for(const item of reply.images){const i=photos.findIndex(p=>p.id===item.id);if(i>=0&&!item.error)$('galleryGrid').children[i].querySelector('img').src=imageUrl(item);}
      }
      if(current===version)say('Choose a photo to view or download. Only watermarked downloads are offered.');
    }catch(error){if(current===version)say(error.message);}
  }
  async function openPhoto(index){
    if(index<0||index>=photos.length)return;const current=++viewVersion;selected=index;$('galleryGrid').hidden=true;$('galleryStage').hidden=false;$('galleryPhoto').removeAttribute('src');$('galleryPhotoLabel').textContent='Photo '+photos[index].number+' of '+total;$('galleryPreviousPhoto').disabled=page===0&&index===0;$('galleryNextPhoto').disabled=page*24+index+1>=total;$('galleryDownload').disabled=true;say('Loading photo…');
    try{
      const photo=photos[index];let url=previewCache.get(photo.id);
      if(url){const access=await api('gallery-status');if(access.status!=='APPROVED'){clearImages();panels('pending');throw Error('Committee approval is required.');}}
      if(!url){const result=await api('gallery-image',{photo:photo.id});if(current!==viewVersion||!token)return;url=imageUrl(result);previewCache.set(photo.id,url);}
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
      const result=await api('gallery-download',{photo:photo.id}),url=imageUrl(result),img=new Image();img.src=url;await img.decode();
      const ratio=Math.min(1,2560/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*ratio);canvas.height=Math.round(img.naturalHeight*ratio);const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image export is unavailable in this browser.');ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const size=Math.max(12,Math.round(canvas.width*.017)),pad=Math.max(12,Math.round(canvas.width*.015)),text='Sai Vista Navratri 2026';ctx.font=`600 ${size}px sans-serif`;const width=ctx.measureText(text).width;ctx.fillStyle='rgba(35,15,31,.66)';ctx.fillRect(canvas.width-width-pad*2,canvas.height-size-pad*2,width+pad*2,size+pad*2);ctx.fillStyle='#fff6df';ctx.textBaseline='bottom';ctx.fillText(text,canvas.width-width-pad,canvas.height-pad);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));if(!blob)throw Error('Could not prepare the image.');if(!token)throw Error('Please sign in again.');
      const downloadUrl=URL.createObjectURL(blob),a=document.createElement('a');a.href=downloadUrl;a.download='Sai-Vista-Navratri-2026-Photo-'+photo.number+'.jpg';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(downloadUrl),10000);report('download_prepared',photo.id);say('Watermarked download prepared. Your download request was recorded.');
    }catch(error){report('download_failed',photo.id);say(error.message);}finally{button.disabled=false;}
  };
})();
