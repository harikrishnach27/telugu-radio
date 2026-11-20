/*
 * Telugu Radio PWA service worker
 * Bump APP_VERSION for every release that changes app shell assets.
 */
const APP_VERSION = "2026-11-20-1";
const CACHE_PREFIX = "telugu-radio-";
const APP_CACHE = `${CACHE_PREFIX}app-${APP_VERSION}`;
const DATA_CACHE = `${CACHE_PREFIX}data-v1`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./offline.html"
];

const toURL = (path) => new URL(path, self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      // Deliberately do not call skipWaiting here. The page asks the
      // waiting worker to activate only after the user chooses Update.
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) &&
        key !== APP_CACHE && key !== DATA_CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function networkFirst(request, fallbackURL) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(APP_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackURL) {
      const fallback = await caches.match(toURL(fallbackURL));
      if (fallback) return fallback;
    }
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Keep the archive's canonical cache key stable even when the page
  // requests archive.json with a cache-busting query string.
  if (url.pathname.endsWith("/archive.json")) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: "no-store" });
        if (response.ok) {
          const cache = await caches.open(DATA_CACHE);
          await cache.put(toURL("./archive.json"), response.clone());
        }
        return response;
      } catch (error) {
        return (await caches.match(toURL("./archive.json"))) ||
          new Response(JSON.stringify({ items: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8" }
          });
      }
    })());
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./offline.html"));
    return;
  }

  // Network-first for same-origin app assets: users get new HTML/CSS/JS
  // promptly; the previous cached copy remains available offline.
  event.respondWith(networkFirst(request));
});
