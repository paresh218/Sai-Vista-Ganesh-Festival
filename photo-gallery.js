(() => {
  const form = document.getElementById('communityPhotoForm');
  const status = document.getElementById('photoStatus');
  const submit = document.getElementById('uploadCommunityPhoto');
  const endpoint = window.SaiVistaPhotos?.endpoint;
  let photos = [], index = 0, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pause = document.getElementById('pausePhotos');
  const viewer = document.getElementById('communityPhotoViewer');
  const openPhoto = document.getElementById('openCommunityPhoto');
  const downloadPhoto = document.getElementById('downloadCommunityPhoto');
  const downloadBranded = document.getElementById('downloadBrandedPhoto');
  const shareStatus = document.getElementById('celebrationShareStatus');
  const website = document.getElementById('celebrationWebsite');
  async function copyField(field, success) {
    try { await navigator.clipboard.writeText(field.value); shareStatus.textContent = success; }
    catch (_) { field.focus(); field.select(); shareStatus.textContent = 'Select and copy the highlighted text to share it.'; }
  }
  document.getElementById('copyCelebrationCaption').onclick = () => copyField(document.getElementById('celebrationCaption'), 'Caption copied. Paste it into your Instagram or Facebook post.');
  document.getElementById('shareCelebrationWebsite').onclick = async () => {
    if (!navigator.share) { await copyField(website, 'Website link copied. Share it with your friends and neighbours.'); return; }
    try { await navigator.share({ title: 'Sai Vista Celebrates', text: 'Explore our festival moments and upcoming celebrations.', url: website.value }); shareStatus.textContent = 'Thank you for spreading the festive spirit!'; }
    catch (error) { if (error.name !== 'AbortError') await copyField(website, 'Website link copied. Paste it wherever you want to share.'); }
  };
  function download(url, name) {
    const link = document.createElement('a');
    link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  }
  downloadPhoto.onclick = () => {
    if (!photos.length) return;
    download(photos[index].image, 'sai-vista-celebration.jpg');
    shareStatus.textContent = 'Photo download requested. Copy the caption to go with your post.';
  };
  downloadBranded.onclick = async () => {
    if (!photos.length) return;
    const selected = photos[index]; // Keep the clicked photo even if the slideshow advances.
    downloadBranded.disabled = true;
    try {
      const image = new Image(); image.src = selected.image; await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(900, image.naturalWidth);
      const photoHeight = Math.round(image.naturalHeight * canvas.width / image.naturalWidth);
      const footerHeight = Math.round(canvas.width * 0.15);
      canvas.height = photoHeight + footerHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, photoHeight);
      ctx.fillStyle = '#641847'; ctx.fillRect(0, photoHeight, canvas.width, footerHeight);
      ctx.fillStyle = '#efbd64'; ctx.fillRect(0, photoHeight, canvas.width, Math.max(3, canvas.width * 0.004));
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff8ed';
      ctx.font = `bold ${Math.round(canvas.width * 0.036)}px Arial, sans-serif`;
      ctx.fillText('Sai Vista Celebrates', canvas.width / 2, photoHeight + footerHeight * 0.45);
      ctx.font = `${Math.round(canvas.width * 0.025)}px Arial, sans-serif`;
      ctx.fillText('saivistaculturalcommittee.in', canvas.width / 2, photoHeight + footerHeight * 0.77);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw Error('Image export failed');
      const url = URL.createObjectURL(blob);
      download(url, 'sai-vista-celebration-branded.jpg');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      shareStatus.textContent = 'Branded photo download requested. Your gallery photo is unchanged.';
    } catch (_) { shareStatus.textContent = 'Could not prepare the branded photo. Please try again or download the photo without a footer.'; }
    finally { downloadBranded.disabled = !photos.length; }
  };
  openPhoto.onclick = () => {
    if (!photos.length || viewer.open) return;
    const photo = photos[index];
    document.getElementById('fullScreenPhoto').src = photo.image;
    document.getElementById('fullScreenPhoto').alt = photo.caption;
    document.getElementById('fullScreenCaption').textContent = photo.caption;
    viewer.showModal();
    document.body.classList.add('photo-viewer-open');
  };
  document.getElementById('closeCommunityPhoto').onclick = () => viewer.close();
  viewer.addEventListener('close', () => {
    document.body.classList.remove('photo-viewer-open');
    document.getElementById('fullScreenPhoto').removeAttribute('src');
    openPhoto.focus({ preventScroll: true });
  });
  const show = () => {
    document.getElementById('photoSlideshow').hidden = !photos.length;
    downloadPhoto.disabled = !photos.length;
    downloadBranded.disabled = !photos.length;
    if (!photos.length) return;
    index = (index + photos.length) % photos.length;
    document.getElementById('communitySlide').src = photos[index].image;
    document.getElementById('communitySlide').alt = photos[index].caption;
    document.getElementById('slideCaption').textContent = `${index + 1} / ${photos.length} · ${photos[index].caption}`;
  };
  const pauseLabel = () => pause.textContent = paused ? 'Play slideshow' : 'Pause slideshow';
  pauseLabel();
  pause.onclick = () => { paused = !paused; pauseLabel(); };
  document.getElementById('previousPhoto').onclick = () => { index--; show(); };
  document.getElementById('nextPhoto').onclick = () => { index++; show(); };
  setInterval(() => { if (!paused && !viewer.open && !document.hidden && photos.length > 1) { index++; show(); } }, 6000);
  async function request(options) {
    const response = await fetch(endpoint, { ...options, signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw Error('Photo service unavailable. Please try again.');
    const result = await response.json();
    if (!result.ok) throw Error(result.error || 'Photo service unavailable.');
    return result;
  }
  async function refresh() {
    const result = await request({ cache: 'no-store' });
    photos = (result.photos || []).filter(photo => /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo.image) && typeof photo.caption === 'string');
    show();
  }
  if (!endpoint) {
    submit.disabled = true;
    status.textContent = 'Community photo uploads are coming soon. The committee is connecting the shared gallery.';
    return;
  }
  refresh().then(() => { status.textContent = 'Upload a JPG, PNG or WebP photo (up to 10 MB) to appear in the public slideshow.'; }).catch(error => { status.textContent = error.message; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const file = document.getElementById('communityPhotoFile').files[0];
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      status.textContent = 'Choose a JPG, PNG or WebP image under 10 MB.'; return;
    }
    submit.disabled = true;
    status.textContent = 'Uploading your photo…';
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const image = canvas.toDataURL('image/jpeg', 0.8);
      if (image.length > 1400000) throw Error('This photo is too large. Please choose a smaller image.');
      await request({ method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ image, caption: document.getElementById('communityPhotoCaption').value.trim(), consent: document.getElementById('communityPhotoConsent').checked }) });
      form.reset(); index = 0;
      status.textContent = 'Your photo has been uploaded. Thank you for sharing!';
      try { await refresh(); } catch (_) { status.textContent = 'Your photo was saved. Reload this page to refresh the slideshow.'; }
    } catch (error) { status.textContent = error.name === 'TimeoutError' ? 'The upload could not be confirmed. Refresh the gallery before trying again.' : error.message; }
    finally { submit.disabled = false; }
  });
})();
