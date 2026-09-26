(() => {
  const form = document.getElementById('communityPhotoForm');
  const input = document.getElementById('communityPhotoFile');
  const submit = document.getElementById('uploadCommunityPhoto');
  const status = document.getElementById('photoStatus');
  const preview = document.getElementById('uploadPreview');
  const photo = document.getElementById('uploadPhotoPreview');
  const video = document.getElementById('uploadVideoPreview');
  const endpoint = window.SaiVistaPhotos?.endpoint;
  let previewUrl, requestId, busy = false;
  function fileKind(file) {
    if (!file) return null;
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      if (!file.size || file.size > 10000000) throw Error('Please choose a photo up to 10 MB.');
      return 'photo';
    }
    if (['video/mp4', 'video/webm'].includes(file.type)) {
      if (!file.size || file.size > 25000000) throw Error('Please choose a video up to 25 MB.');
      return 'video';
    }
    throw Error('Choose a JPG, PNG or WebP photo, or an MP4 or WebM video.');
  }
  function clearPreview() {
    video.pause(); video.removeAttribute('src'); video.load(); photo.removeAttribute('src');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null; photo.hidden = true; video.hidden = true; preview.hidden = true;
  }
  function selection() {
    if (busy) return;
    clearPreview(); requestId = null; submit.disabled = !endpoint;
    try {
      const file = input.files[0], kind = fileKind(file);
      if (!kind) { submit.textContent = 'Share this moment'; status.textContent = 'Choose a photo or video to get started.'; return; }
      previewUrl = URL.createObjectURL(file);
      const target = kind === 'photo' ? photo : video; target.src = previewUrl; target.hidden = false; preview.hidden = false;
      document.getElementById('uploadFileSummary').textContent = `${file.name} · ${(file.size / 1000000).toFixed(1)} MB · ${kind === 'photo' ? 'Photo' : 'Video'}`;
      submit.textContent = kind === 'photo' ? 'Share photo' : 'Submit video for approval';
      status.textContent = kind === 'photo' ? 'Your photo will appear in the community slideshow.' : 'Your video will appear after committee approval.';
      if (kind === 'video' && !window.SaiVistaMediaReady) { submit.disabled = true; status.textContent = 'Connecting to video uploads… Use Refresh videos below if this message remains.'; }
    } catch (error) { submit.disabled = true; status.textContent = error.message; }
  }
  input.addEventListener('change', selection);
  form.addEventListener('input', () => { if (!busy) requestId = null; });
  window.addEventListener('sai-vista-media-ready', () => { if (!busy && input.files[0]?.type.startsWith('video/')) selection(); });
  document.getElementById('clearUploadFile').onclick = () => { input.value = ''; selection(); input.focus(); };
  function readFile(file) {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = () => reject(Error('This video could not be read. Please choose it again.')); reader.readAsDataURL(file); });
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !endpoint) return;
    let kind;
    try {
      const file = input.files[0]; kind = fileKind(file);
      if (!kind) throw Error('Choose a photo or video first.');
      if (kind === 'video' && !window.SaiVistaMediaReady) throw Error('Video uploads are temporarily unavailable. Please refresh videos and try again.');
      const caption = document.getElementById('communityPhotoCaption').value.trim();
      const consent = document.getElementById('communityPhotoConsent').checked;
      if (!caption || !consent) throw Error('Add a caption and confirm permission to share.');
      busy = true; form.setAttribute('aria-busy', 'true'); for (const control of form.elements) control.disabled = true;
      video.pause(); status.textContent = kind === 'photo' ? 'Preparing and uploading your photo…' : 'Uploading your video… Keep this page open; larger clips may take a few minutes.';
      let payload;
      if (kind === 'photo') {
        const bitmap = await createImageBitmap(file);
        const ratio = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
        const image = canvas.toDataURL('image/jpeg', 0.8);
        if (image.length > 1400000) throw Error('This photo is too detailed to upload. Try a smaller photo.');
        payload = { image, caption, consent };
      } else {
        requestId ||= crypto.randomUUID();
        payload = { action: 'submitMedia', type: 'video', caption, consent, requestId, mime: file.type, video: await readFile(file) };
      }
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(kind === 'video' ? 180000 : 45000) });
      if (!response.ok) throw Error('The upload service is unavailable. Please try again.');
      const result = await response.json(); if (!result.ok) throw Error(result.error || 'Upload failed. Please try again.');
      form.reset(); clearPreview(); requestId = null;
      status.textContent = kind === 'photo' ? 'Your photo has been shared! Thank you for celebrating with us.' : result.pending ? 'Video received! The committee will review it before it appears.' : 'This video has already been approved.';
      submit.textContent = 'Share another moment';
      if (kind === 'photo') window.dispatchEvent(new Event('sai-vista-photo-uploaded'));
    } catch (error) {
      status.textContent = error.name === 'TimeoutError' || error instanceof TypeError ? (kind === 'video' ? 'We could not confirm the upload. Retry without changing the form to avoid a duplicate submission.' : 'We could not confirm the upload. Check the slideshow before trying again.') : error.message;
    } finally { busy = false; form.removeAttribute('aria-busy'); for (const control of form.elements) control.disabled = false; submit.disabled = !endpoint; }
  });
  if (!endpoint) { submit.disabled = true; status.textContent = 'Community uploads are coming soon.'; }
})();
