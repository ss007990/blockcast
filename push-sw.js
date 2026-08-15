// Imported into the generated Workbox service worker (see vite.config.ts).
// Handles incoming Web Push messages from the BlockCast worker.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* non-JSON push — show a generic notification */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'BlockCast', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag,
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || '/'));
});
