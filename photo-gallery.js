(() => {
  const form = document.getElementById('communityPhotoForm');
  const status = document.getElementById('photoStatus');
  const submit = document.getElementById('uploadCommunityPhoto');
  const endpoint = window.SaiVistaPhotos?.endpoint;
  let photos = [], index = 0, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pause = document.getElementById('pausePhotos');
  const show = () => {
    document.getElementById('photoSlideshow').hidden = !photos.length;
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
  setInterval(() => { if (!paused && !document.hidden && photos.length > 1) { index++; show(); } }, 6000);
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
