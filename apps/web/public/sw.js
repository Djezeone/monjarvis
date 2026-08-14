/**
 * P6 brick 4 — JARVIS X2 service worker.
 *
 * Honest by design: it NEVER caches /api/jarvis/* (no stale state, ever —
 * the Core-offline story is handled by the cockpit banner and the local
 * pending queue). What it does:
 *   - navigations: network first, cached /offline page as last resort;
 *   - static assets (/assets/*, icons, manifest): cache first, since they
 *     are immutable pack files.
 */
const CACHE = "jarvis-x2-v2";
const PRECACHE = [
  "/offline",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/assets/brand/jarvis-x2-mark.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// P6 brick 5 — web push: JARVIS reaches this device even with the app
// closed. Payloads are JSON {title, body} sent by the Core's Presence Bus.
self.addEventListener("push", (event) => {
  let payload = { title: "JARVIS", body: "" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data ? event.data.text() : "";
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const open = clients.find((c) => "focus" in c);
      return open ? open.focus() : self.clients.openWindow("/app");
    })
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // API: always the network, never a cache — state honesty above all.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  const isStatic =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/manifest.webmanifest";
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
});
