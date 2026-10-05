/* Voxa — service worker : installation + mode hors-ligne */
const V = "voxa-v1";
const SHELL = ["./manifest.webmanifest", "./favicon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", e => {
  if (e.data && e.data.type === "precache" && Array.isArray(e.data.urls)) {
    e.waitUntil(caches.open(V).then(c => Promise.all(e.data.urls.map(u => c.add(u).catch(() => {})))));
  }
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // API cloud, polices : on laisse passer
  if (req.mode === "navigate") {                           // page : réseau d'abord, cache si hors-ligne
    e.respondWith(
      fetch(req).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(req, cp)); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./") || caches.match("./index.html")))
    );
    return;
  }
  e.respondWith(                                           // fichiers : cache d'abord, mise à jour en arrière-plan
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(req, cp)); } return res; }).catch(() => hit);
      return hit || net;
    })
  );
});
