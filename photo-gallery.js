(() => {
  const status = document.getElementById('galleryPhotoStatus');
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
  if (!endpoint) { status.textContent = 'Community photos are coming soon.'; return; }
  const loadPhotos = () => refresh().then(() => { status.textContent = photos.length ? '' : 'Your community gallery is waiting for its first photo.'; }).catch(error => { status.textContent = error.message; });
  window.addEventListener('sai-vista-photo-uploaded', loadPhotos);
  loadPhotos();
})();
