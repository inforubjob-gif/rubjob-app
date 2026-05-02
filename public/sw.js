self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Rubjob Update';
  const options = {
    body: data.body || 'You have a new update on your order.',
    icon: '/images/rubjob-complete_logo-color.png',
    badge: '/favicon.ico',
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
