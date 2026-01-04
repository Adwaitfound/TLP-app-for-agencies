// Minimal service worker to avoid parse errors and stale caches.
// No caching; simply installs, activates, and claims clients.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch (no interception)
self.addEventListener('fetch', () => {});

// No-op push handlers to avoid errors if push is invoked
self.addEventListener('push', () => {});
self.addEventListener('notificationclick', (event) => {
  event.notification?.close?.();
});
self.addEventListener('notificationclose', () => {});
