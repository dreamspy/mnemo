var CACHE_NAME = "mnemo-v1";
var SHELL_FILES = [
  ".",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.json",
  "icons/icon-192.svg",
  "icons/icon-512.svg",
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; })
          .map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  // Only cache GET requests for app shell; let API calls pass through
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request);
    })
  );
});
