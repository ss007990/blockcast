"use strict";
/* BlockCast service worker — offline shell + install support.
   Strategy: network-first with cache fallback, so updates always win
   when online and the app still opens offline. Live data APIs and map
   tiles are never cached (stale forecasts are worse than none). */

const CACHE = "blockcast-v2";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
];
const LIVE_HOSTS = [
  "api.open-meteo.com",
  "geocoding-api.open-meteo.com",
  "api.bigdatacloud.net",
  "tile.openstreetmap.org",
  "blockcast.goatcounter.com",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      // cross-origin entries are fetched with CORS so the cached responses are
      // readable — index.html loads Leaflet with subresource integrity, which
      // an opaque (no-cors) cached response would fail offline
      .then(c => Promise.allSettled(SHELL.map(u =>
        c.add(u.startsWith("http") ? new Request(u, {mode: "cors"}) : u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (LIVE_HOSTS.includes(url.hostname)) return;

  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() =>
      caches.match(req).then(m => m || (req.mode === "navigate" ? caches.match("./index.html") : Response.error()))
    )
  );
});
