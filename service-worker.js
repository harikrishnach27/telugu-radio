
const CACHE_NAME = "telugu-audio-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key =>
            key.startsWith("telugu-audio-") &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Archive: network first, cached fallback
  if (url.pathname.endsWith("/archive.json")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();

            const archiveKey = new URL(
              "./archive.json",
              self.registration.scope
            ).href;

            caches.open(CACHE_NAME).then(cache =>
              cache.put(archiveKey, copy)
            );
          }

          return response;
        })
        .catch(async () => {
          const archiveKey = new URL(
            "./archive.json",
            self.registration.scope
          ).href;

          return (
            await caches.match(archiveKey)
          ) || new Response(
            "Archive unavailable offline",
            { status: 503 }
          );
        })
    );

    return;
  }

  // Website navigation: network first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        return (
          await caches.match(request)
        ) || (
          await caches.match("./index.html")
        );
      })
    );

    return;
  }

  // Other same-origin files: cache first
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache =>
            cache.put(request, copy)
          );
        }

        return response;
      });
    })
  );
});
