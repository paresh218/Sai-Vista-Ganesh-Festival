// Detect changes to the page and its code without requiring version-number edits.
(() => {
  if (!/^https?:$/.test(location.protocol)) return;
  let dirty = false, pending = false, checking = false, baseline, registration;
  let loadedMarkup;
  const normaliseMarkup = html => new DOMParser().parseFromString(html, 'text/html').documentElement.outerHTML;
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
    if (!pending || document.visibilityState !== 'visible') return;
    if (!busy()) { location.reload(); return; }
    if (banner) return;
    banner = document.createElement('aside');
    banner.setAttribute('role', 'status');
    banner.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;z-index:10000;background:#fff3d7;color:#35271f;padding:16px;border:1px solid #ad702d;border-radius:12px;box-shadow:0 4px 20px #0003';
    banner.append('A site update is ready. Finish your registration before updating. ');
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
    // Compare with the original DOM, before translations/widgets change it.
    // A fresh server response must not become the baseline for a stale page.
    if (loadedMarkup && loadedMarkup !== normaliseMarkup(html)) {
      pending = true;
      applyUpdate();
      return;
    }
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const urls = [...parsed.querySelectorAll('script[src],link[rel="stylesheet"][href]')]
      .map(node => new URL(node.getAttribute('src') || node.getAttribute('href'), page))
      .filter(url => url.origin === location.origin);
    const contents = await Promise.all(urls.map(async url => {
      const res = await fetch(freshURL(url), {cache:'no-store', signal:AbortSignal.timeout(15000)});
      if (!res.ok) throw new Error('Update asset unavailable');
      return res.text();
    }));
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([html,...contents])));
    return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2,'0')).join('');
  }
  async function check() {
    if (!loadedMarkup || checking || document.visibilityState !== 'visible' || !navigator.onLine) return;
    if (pending) { applyUpdate(); return; }
    checking = true;
    try {
      await registration?.update();
      const next = await fingerprint();
      if (baseline && baseline !== next) { pending = true; applyUpdate(); }
      else baseline = next;
    } catch (_) { /* Offline or incomplete deployment: keep the current page. */ }
    finally { checking = false; }
  }
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      pending = true; applyUpdate();
    });
    navigator.serviceWorker.register('service-worker.js', {updateViaCache:'none'})
      .then(value => { registration = value; return check(); })
      .catch(() => check());
  }
  document.addEventListener('DOMContentLoaded', () => {
    loadedMarkup = normaliseMarkup(document.documentElement.outerHTML);
    check();
  });
  document.addEventListener('visibilitychange', check);
  window.addEventListener('online', check);
  setInterval(check, 5 * 60 * 1000);
})();
