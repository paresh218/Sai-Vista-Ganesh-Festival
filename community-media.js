(() => {
  const endpoint = window.SaiVistaPhotos?.endpoint;
  const reelForm = document.getElementById('communityReelForm');
  const status = document.getElementById('mediaStatus');
  const grid = document.getElementById('communityMediaGrid');
  const refreshButton = document.getElementById('refreshCommunityMedia');
  let ready = false, instagramScript;
  function reelUrl(value) {
    const match = /^https:\/\/(?:www\.)?instagram\.com\/reels?\/([A-Za-z0-9_-]{5,64})\/?(?:\?[^#\s]*)?(?:#[^\s]*)?$/i.exec(value.trim());
    if (!match) throw Error('Paste a direct Instagram Reel link: https://www.instagram.com/reel/ABC123/.');
    return `https://www.instagram.com/reel/${match[1]}/`;
  }
  function node(tag, text, className) {
    const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el;
  }
  async function request(options, url = endpoint) {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(180000) });
    if (!response.ok) throw Error('The media service could not be reached. Please try again.');
    const result = await response.json();
    if (!result.ok) throw Error(result.error || 'Submission failed. Please try again.');
    return result;
  }
  function loadInstagram() {
    if (window.instgrm?.Embeds) return Promise.resolve();
    if (!instagramScript) instagramScript = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://www.instagram.com/embed.js'; script.async = true;
      const timer = setTimeout(() => { script.remove(); instagramScript = null; reject(Error('Instagram took too long to respond. Use Open on Instagram below.')); }, 20000);
      script.onload = () => { clearTimeout(timer); if (window.instgrm?.Embeds) resolve(); else { instagramScript = null; reject(Error('Instagram playback is unavailable. Use Open on Instagram below.')); } };
      script.onerror = () => { clearTimeout(timer); script.remove(); instagramScript = null; reject(Error('Instagram could not load. Use Open on Instagram below.')); };
      document.head.append(script);
    });
    return instagramScript;
  }
  function render(items) {
    grid.replaceChildren();
    for (const item of items) {
      let url;
      try {
        if (item.type === 'instagram') url = reelUrl(item.url);
        else if (item.type === 'video' && /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/preview$/.test(item.url)) url = item.url;
        else continue;
      } catch (_) { continue; }
      const card = node('article', '', 'community-media-card');
      const title = node('h4', item.caption || 'A Sai Vista festival moment');
      const player = node('div', '', 'community-media-player');
      const play = node('button', item.type === 'instagram' ? '▶ Watch Reel here' : '▶ Play video'); play.type = 'button';
      const hint = node('p', item.type === 'instagram' ? 'Loads Instagram when you choose to watch. Instagram may ask you to sign in or prevent embedding.' : 'Plays here using Google Drive. New uploads may take a little time to become playable.');
      const feedback = node('p'); feedback.setAttribute('role', 'status');
      const fallback = node('a', item.type === 'instagram' ? 'Open on Instagram ↗' : 'Open video in Google Drive ↗');
      fallback.href = url.replace(/\/preview$/, '/view'); fallback.target = '_blank'; fallback.rel = 'noopener noreferrer';
      play.onclick = async () => {
        play.disabled = true;
        if (item.type === 'video') {
          const iframe = document.createElement('iframe'); iframe.src = url; iframe.title = title.textContent; iframe.allow = 'fullscreen'; iframe.allowFullscreen = true; player.replaceChildren(iframe); play.hidden = true; return;
        }
        const quote = node('blockquote'); quote.className = 'instagram-media'; quote.dataset.instgrmPermalink = url; quote.dataset.instgrmVersion = '14';
        const link = node('a', 'View this Reel on Instagram'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; quote.append(link); player.replaceChildren(quote);
        feedback.textContent = 'Loading Instagram…';
        try { await loadInstagram(); window.instgrm.Embeds.process(); feedback.textContent = 'If the Reel does not play, use Open on Instagram below.'; play.hidden = true; }
        catch (error) { feedback.textContent = error.message; play.disabled = false; }
      };
      card.append(title, play, player, hint, feedback, fallback); grid.append(card);
    }
  }
  async function refresh() {
    if (!endpoint) { status.textContent = 'Community videos are coming soon.'; return; }
    refreshButton.disabled = true;
    try {
      const result = await request({ cache: 'no-store' }, endpoint + '?action=media');
      ready = result.mediaVersion === 2;
      window.SaiVistaMediaReady = ready;
      window.dispatchEvent(new CustomEvent('sai-vista-media-ready', { detail: ready }));
      if (!ready) throw Error('Video and Reel submissions are coming soon. The committee is updating the upload service.');
      render(result.items || []);
      status.textContent = grid.children.length ? 'Approved community moments. Choose a video to watch.' : 'No approved videos yet. Be the first to share a festival moment.';
      for (const form of [reelForm]) { if (!form.dataset.busy) form.querySelector('button').disabled = false; }
      if (!reelForm.dataset.busy) document.getElementById('reelUploadStatus').textContent = 'Use the direct public Reel link. Duplicate links are recognised.';
    } catch (error) {
      status.textContent = error.message;
      if (!ready) for (const id of ['reelUploadStatus']) document.getElementById(id).textContent = 'Submissions will open after the committee updates the service.';
    } finally { refreshButton.disabled = false; }
  }
  for (const [form, type, messageId] of [[reelForm, 'instagram', 'reelUploadStatus']]) {
    let requestId;
    form.addEventListener('input', () => { requestId = null; });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (!ready || form.dataset.busy) return;
      const message = document.getElementById(messageId), button = form.querySelector('button');
      const payload = { action: 'submitMedia', type, caption: form.elements.caption.value.trim(), consent: form.elements.consent.checked };
      try {
        if (!payload.caption || !payload.consent) throw Error('Add a caption and confirm permission to share.');
        payload.url = reelUrl(form.elements.reelUrl.value);
        requestId ||= crypto.randomUUID(); payload.requestId = requestId;
        form.dataset.busy = 'true'; for (const control of form.elements) control.disabled = true;
        message.textContent = 'Submitting Reel…';
        const result = await request({ method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        message.textContent = result.pending ? (result.duplicate ? 'This submission is already awaiting committee approval.' : 'Received! Your submission will appear after committee approval.') : 'This Reel is already in the community gallery.';
        form.reset(); requestId = null;
      } catch (error) { message.textContent = error.name === 'TimeoutError' || error instanceof TypeError ? 'We could not confirm the submission. You can retry without changing the form; the same submission will not be saved twice.' : error.message; }
      finally { delete form.dataset.busy; for (const control of form.elements) control.disabled = false; button.disabled = !ready; }
    });
  }
  refreshButton.onclick = refresh;
  refresh();
})();
