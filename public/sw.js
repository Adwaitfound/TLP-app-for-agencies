// Minimal service worker to avoid parse errors and stale caches.
// No caching; installs, waits for user approval when updating, and claims clients.

self.addEventListener('install', () => {
  // Activate immediately on first install; on updates we wait so the UI can prompt.
  if (!self.registration.active) {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// No-op push handlers to avoid errors if push is invoked
self.addEventListener('push', () => {});
self.addEventListener('notificationclick', (event) => {
  event.notification?.close?.();
});
self.addEventListener('notificationclose', () => {});
