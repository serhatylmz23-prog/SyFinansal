// SyFinansOtağı Service Worker v3.1
// Sürüm: 3.1 | Offline First PWA

const CACHE_NAME = 'syfinans-v3-3-2026-08-09';
const STATIC_ASSETS = [
  './',
  './index.html',
  './js/app.js',
  './manifest.json',
  './favicon.ico',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];
// cache.add() artık tek tek yapılıyor (bkz. aşağıdaki install handler),
// böylece ileride eksik/değişen bir dosya olursa TÜM SW kurulumu iptal olmaz.

// Install: Statik dosyaları cache'e al (tek tek, biri başarısız olursa diğerlerini engellemesin)
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url)));
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.warn('[SW] Önbelleğe alınamadı:', STATIC_ASSETS[i], r.reason);
        }
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Eski cache'leri temizle
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Cache-first stratejisi
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Canlı veri kaynakları (deprem, hava durumu vb.) her zaman ağdan çekilmeli, önbellekten değil
  const liveDataHosts = ['orhanaydogdu.com.tr', 'usgs.gov', 'seismicportal.eu', 'open-meteo.com'];
  const isLiveData = url.pathname.includes('/api/') || url.host.includes('api.') ||
    liveDataHosts.some(h => url.host.endsWith(h));

  if (isLiveData) {
    e.respondWith(networkFirst(request));
    return;
  }

  // Statik dosyalar için cache-first
  e.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Çevrimdışı modda veri bulunamadı', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ offline: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background Sync
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-portfolio') {
    e.waitUntil(syncPortfolioData());
  }
});

async function syncPortfolioData() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  });
}

// Push Notifications
self.addEventListener('push', (e) => {
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.tag || 'syfinans',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || []
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.openWindow('/index.html')
  );
});
