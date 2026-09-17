// Service worker de Sport Marks: funciona sin conexión y se actualiza solo.
// Al publicar cambios, sube CACHE (y el ?v= de index.html) para forzar la renovación.
const CACHE = 'sportmarks-v1';
const CORE = [
  './',
  'index.html',
  'styles.css?v=1',
  'app.js?v=1',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-64.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Primero la caché (arranca al instante, también en el gimnasio sin cobertura)
// y en segundo plano se descarga la versión nueva para la próxima vez.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !fonts) return;

  const fresh = fetch(req)
    .then(async res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        try { await (await caches.open(CACHE)).put(req, copy); } catch { /* caché llena: se sirve igual */ }
      }
      return res;
    })
    .catch(() => null);
  e.waitUntil(fresh);

  e.respondWith(
    caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(async cached => {
      if (cached) return cached;
      const res = await fresh;
      if (res) return res;
      if (req.mode === 'navigate') return (await caches.match('index.html')) || Response.error();
      return Response.error();
    })
  );
});
