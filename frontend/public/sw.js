/* ShuleCloud 360 service worker.
 *
 * Makes the app installable and gives it a fast, resilient shell:
 *   - pages (navigations): network first, so a new release is picked up immediately; the last good
 *     copy of the app shell is used only when the device is offline
 *   - built files (/assets/… are content-hashed, plus icons and fonts): cache first
 *   - everything else — API calls, other origins, non-GET requests — is left alone, so data is never stale
 * Bump VERSION to force old caches to be dropped.
 */
const VERSION = "sc360-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("/", copy)); }
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } }))),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || /\.(?:png|svg|ico|woff2?|webp|jpg)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
  }
});
