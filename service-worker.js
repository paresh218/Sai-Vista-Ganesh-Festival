if(typeof importScripts==='function')importScripts('private-video-worker.js?v=3');
const CACHE_NAME = "sai-vista-ganpati-2026-v153";
const APP_SHELL = [
  "./",
  "site-updates.js",
  "private-video-core.js?v=2",
  "private-video.js?v=6",
  "video-community.js?v=4",
  "assets/comment-robot.svg",
  "private-video.css?v=7",
  "private-video-worker.js?v=3",
  "cultural-fund-reminder.js?v=4",
  "cultural-fund-reminder.css?v=1",
  "assets/cultural-fund-meme.svg",
  "protected-gallery.js?v=8",
  "protected-gallery-local.js?v=1",
  "protected-gallery-config.js?v=2",
  "protected-gallery-cache.js?v=3",
  "protected-gallery.css?v=4",
  "community-season.js?v=4",
  "community-season.css?v=6",
  "assets/sai-vista-marathon-coming-soon.webp",
  "index.html",
  "style.css?v=22",
  "mobile-components.css?v=1",
  "site-data.js?v=3",
  "resident-access-config.js",
  "resident-access.js",
  "resident-access.css",
  "responsive-refinement.css",
  "navratri.css",
  "navratri-songs.css",
  "navratri-songs-config.js",
  "navratri-songs.js",
  "song-offline.js",
  "garba-special.js",
  "garba-dj-controls.js",
  "player-modern.js",
  "music-evening.js",
  "player-modern.css?v=123",
  "garba-special.css?v=119",
  "garba-catalogue.json",
  "song-retro.js",
  "song-layout.js",
  "dj-decks.js",
  "playlist-time.js",
  "song-popup.js",
  "song-mini.js",
  "dj-studio-loader.js",
  "dj-studio.js",
  "dj-analysis-worker.js",
  "navratri-translations.js",
  "navratri-layout.js?v=2",
  "photo-gallery-config.js",
  "photo-gallery.js",
  "community-media.js",
  "community-upload.js",
  "navratri-days.js",
  "goddess-slideshow.js",
  "assets/navratri-2026.png",
  "event-registration-config.js",
  "event-registration-model.js",
  "event-registration.js?v=7",
  "festival-experience.js?v=8",
  "event-ux.js?v=7",
  "ux-translations.js?v=8",
  "assets/neeraj-funfair-qr.jpeg",
  "assets/artisanal-sweets.jpeg",
  "translations.js?v=8",
  "script.js?v=24",
  "expense-model.js?v=13",
  "expense-dashboard.js?v=17",
  "manifest.webmanifest",
  "assets/sai-vista-logo.png",
  "assets/sai-vista-pwa-icon-192.png",
  "assets/sai-vista-pwa-icon.png",
  "assets/ganpati-2026-event-schedule.png",
  "assets/ganpati-kurta-real.png",
  "assets/kurta-bill-2026-09-11.jpg"
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
  if(new URL(event.request.url).pathname.startsWith('/__private-video/')||new URL(event.request.url).pathname.startsWith('/assets/protected-video/'))return;
  // Let the browser handle video range requests and seeking directly.
  if (/\.(?:mp4|webm)$/i.test(new URL(event.request.url).pathname)) return;
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
