const CACHE_NAME = "sai-vista-ganpati-2026-v10";
const APP_SHELL = [
  "./",
  "index.html",
  "style.css",
  "site-data.js",
  "translations.js",
  "script.js",
  "manifest.webmanifest",
  "assets/sai-vista-logo.png",
  "assets/sai-vista-pwa-icon-192.png",
  "assets/sai-vista-pwa-icon.png",
  "assets/ganpati-2026-event-schedule.png",
  "assets/ganpati-kurta-real.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match("./")))
  );
});
