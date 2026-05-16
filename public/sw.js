// RubJob Service Worker — Handles push notifications & offline caching

const CACHE_NAME = 'rubjob-v1';

// Push notification received
self.addEventListener('push', (event) => {
  let data = { title: 'Rubjob', body: 'มีการอัปเดตใหม่', url: '/' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    // If not JSON, try text
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'คุณมีการแจ้งเตือนใหม่',
    icon: '/images/rubjob-complete_logo-color.png',
    badge: '/images/rubjob-complete_logo-color.png',
    vibrate: [200, 100, 200],
    tag: 'rubjob-notification',
    renotify: true,
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'เปิดดู' },
      { action: 'close', title: 'ปิด' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Rubjob', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('rubjob') && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Otherwise open new window
      return clients.openWindow(urlToOpen);
    })
  );
});

// Install — cache essential assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});
