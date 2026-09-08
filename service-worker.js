const CACHE_NAME = "sai-vista-ganpati-2026-v32";
const APP_SHELL = [
  "./",
  "site-updates.js",
  "index.html",
  "style.css?v=19",
  "site-data.js",
  "feta-registration.js?v=5",
  "assets/orange-marathi-feta.png",
  "assets/feta-payment-qr.jpeg",
  "translations.js",
  "script.js?v=22",
  "expense-model.js?v=13",
  "expense-dashboard.js?v=17",
  "manifest.webmanifest",
  "assets/sai-vista-logo.png",
  "assets/sai-vista-pwa-icon-192.png",
  "assets/sai-vista-pwa-icon.png",
  "assets/ganpati-2026-event-schedule.png",
  "assets/ganpati-kurta-real.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(
    APP_SHELL.map(url => new Request(url, { cache: "reload" }))
  )).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("sai-vista-ganpati-") && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

// Fresh files online; cached files are only an offline/error fallback.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  // Update probes must see the server, never a cached fallback.
  if (event.request.cache === "no-store") return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const url = new URL(event.request.url);
      const isCode = event.request.mode === "navigate" || /\.(?:html|js|css|json)$/.test(url.pathname);
      // Avoid both browser and CDN copies for pages/code, even with unchanged filenames.
      if (isCode) url.searchParams.set('__sv_fresh', Date.now().toString());
      const response = isCode
        ? await fetch(url.href, { cache: "no-store", credentials: "same-origin" })
        : await fetch(event.request, { cache: "no-cache" });
      if (response.ok) {
        event.waitUntil(cache.put(event.request, response.clone()).catch(() => {}));
        return response;
      }
      if (response.status < 500) return response;
      const cached = await cache.match(event.request);
      return cached || response;
    } catch (_) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      if (event.request.mode === "navigate") {
        const page = await cache.match("index.html") || await cache.match("./");
        if (page) return page;
      }
      return Response.error();
    }
  })());
});
