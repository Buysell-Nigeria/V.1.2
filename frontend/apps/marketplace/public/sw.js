const CACHE = 'buysell-unified-ui-20261010';
const APP_SHELL = '/index.html';
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(APP_SHELL)).catch(() => {}));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim(),
  ]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(APP_SHELL, clone)).catch(() => {});
      }
      return response;
    }).catch(async () => (await caches.match(APP_SHELL)) || Response.error()));
    return;
  }
  if (/\/(?:assets|brand)\//.test(new URL(request.url).pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, clone)).catch(() => {});
      }
      return response;
    })));
  }
});
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; }
  catch { data = { body: event.data?.text() || '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'BUYSELL Nigeria', {
    body: data.body || 'You have a new marketplace update.',
    data: { url: data.url || '/shop' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || '/shop'));
});
