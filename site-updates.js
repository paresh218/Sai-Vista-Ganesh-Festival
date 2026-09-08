// Detect changes to the page and its code without requiring version-number edits.
(() => {
  if (!/^https?:$/.test(location.protocol)) return;
  let dirty = false, pending = false, checking = false, baseline, registration;
  let ready = false, reloading = false;
  const loadedRelease = document.querySelector('meta[name="site-release"]')?.content;
  const reloadKey = 'saiVistaAutoReload';
  function canAutoReload(version) {
    try {
      const previous = JSON.parse(sessionStorage.getItem(reloadKey) || 'null');
      if (previous && (previous.version === version || Date.now() - previous.time < 60000)) return false;
      sessionStorage.setItem(reloadKey, JSON.stringify({version, time: Date.now()}));
      return true;
    } catch (_) { return false; } // No persistent guard: require a click instead.
  }
  function freshURL(value) {
    const url = new URL(value, location.href);
    url.searchParams.set('__sv_check', Date.now().toString());
    return url;
  }
  document.addEventListener('input', event => { if (event.target.closest('form')) dirty = true; });
  document.addEventListener('change', event => { if (event.target.closest('form')) dirty = true; });
  const busy = () => dirty || document.querySelector('dialog[open], #formModal:not(.hidden), #upiPaymentModal:not(.hidden)');
  let banner;
  function applyUpdate() {
    if (!pending || reloading || !ready || document.visibilityState !== 'visible') return;
    if (!busy() && canAutoReload(pending)) { reloading = true; location.reload(); return; }
    if (banner) return;
    banner = document.createElement('aside');
    banner.setAttribute('role', 'status');
    banner.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;z-index:10000;background:#fff3d7;color:#35271f;padding:16px;border:1px solid #ad702d;border-radius:12px;box-shadow:0 4px 20px #0003';
    banner.append('A site update is available. If you are registering, finish before updating. ');
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn-dark'; button.textContent = 'Update now';
    button.addEventListener('click', () => {
      if (!busy() || window.confirm('Reload the website now? Unsaved form details will be lost.')) location.reload();
    });
    banner.append(button); document.body.append(banner);
  }
  async function fingerprint() {
    const page = new URL('index.html', location.href).href;
    const response = await fetch(freshURL(page), {cache:'no-store', signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('Update check unavailable');
    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const serverRelease = parsed.querySelector('meta[name="site-release"]')?.content;
    const urls = [...parsed.querySelectorAll('script[src],link[rel="stylesheet"][href]')]
      .map(node => new URL(node.getAttribute('src') || node.getAttribute('href'), page))
      .filter(url => url.origin === location.origin);
    const contents = await Promise.all(urls.map(async url => {
      const res = await fetch(freshURL(url), {cache:'no-store', signal:AbortSignal.timeout(15000)});
      if (!res.ok) throw new Error('Update asset unavailable');
      return res.text();
    }));
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([html,...contents])));
    return { version: Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2,'0')).join(''), release: serverRelease };
  }
  async function check() {
    if (!ready || checking || document.visibilityState !== 'visible' || !navigator.onLine) return;
    if (pending) { applyUpdate(); return; }
    checking = true;
    try {
      await registration?.update();
      const next = await fingerprint();
      if ((next.release && next.release !== loadedRelease) || (baseline && baseline !== next.version)) {
        pending = next.version; applyUpdate();
      } else baseline = next.version;
    } catch (_) { /* Offline or incomplete deployment: keep the current page. */ }
    finally { checking = false; }
  }
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      check(); // A controller change alone does not mean the displayed page is stale.
    });
    navigator.serviceWorker.register('service-worker.js', {updateViaCache:'none'})
      .then(value => { registration = value; return check(); })
      .catch(() => check());
  }
  document.addEventListener('DOMContentLoaded', () => {
    ready = true;
    check();
  });
  document.addEventListener('visibilitychange', check);
  window.addEventListener('online', check);
  setInterval(check, 5 * 60 * 1000);
})();
