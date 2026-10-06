const CACHE = 'morgenrot-v8';
const CORE = ['./', 'index.html'];
const EXTRA = ['manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);                                        // ohne die Seite selbst geht offline nichts
    await Promise.all(EXTRA.map(f => c.add(f).catch(() => {})));  // fehlende Icons brechen die Installation nicht ab
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) {
      // Im Hintergrund aktualisieren, wenn Internet da ist
      e.waitUntil(fetch(req).then(res => { if (res.ok) return cache.put(req, res); }).catch(() => {}));
      return hit;
    }
    try {
      const res = await fetch(req);
      if (res.ok && (new URL(req.url).origin === location.origin || req.url.startsWith('https://fonts.'))) cache.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate') return (await cache.match('index.html')) || (await cache.match('./'));
      return new Response('', { status: 504 });
    }
  })());
});
