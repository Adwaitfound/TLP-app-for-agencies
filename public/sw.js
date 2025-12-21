// Service Worker for aggressive caching and offline support
const STATIC_CACHE = 'tlp-static-v1';
const DYNAMIC_CACHE = 'tlp-dynamic-v1';

// Cache these static assets immediately
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
];

if (typeof window === 'undefined') {
    // Install event - cache static assets
    self.addEventListener('install', (event) => {
        event.waitUntil(
            caches.open(STATIC_CACHE).then((cache) => {
                return cache.addAll(STATIC_ASSETS).catch(() => { });
            })
        );
        self.skipWaiting();
    });

    // Activate event - clean old caches
    self.addEventListener('activate', (event) => {
        event.waitUntil(
            caches.keys().then((keys) => {
                return Promise.all(
                    keys
                        .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                        .map((key) => caches.delete(key))
                );
            })
        );
        self.clients.claim();
    });

    // Fetch event - serve from cache, fallback to network
    self.addEventListener('fetch', (event) => {
        const { request } = event;
        const url = new URL(request.url);

        // Skip non-GET requests
        if (request.method !== 'GET') return;

        // Skip Supabase API calls and external resources
        if (url.origin.includes('supabase') ||
            url.origin.includes('google') ||
            url.pathname.startsWith('/api/')) {
            return;
        }

        event.respondWith(
            caches.match(request).then((cached) => {
                // Return cached version if available
                if (cached) {
                    // Fetch in background to update cache
                    fetch(request).then((response) => {
                        if (response.ok) {
                            caches.open(DYNAMIC_CACHE).then((cache) => {
                                cache.put(request, response);
                            });
                        }
                    }).catch(() => { });
                    return cached;
                }

                // Not in cache, fetch from network
                return fetch(request).then((response) => {
                    // Cache successful responses
                    if (response.ok && url.origin === location.origin) {
                        const clone = response.clone();
                        caches.open(DYNAMIC_CACHE).then((cache) => {
                            cache.put(request, clone);
                        });
                    }
                    return response;
                });
            })
        );
    });

    self.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
            self.skipWaiting();
        }
    });

    self.addEventListener('push', (event) => {
        const data = event.data ? event.data.json() : {};
        const options = {
            body: data.body || 'New notification',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: data.tag || 'notification',
            requireInteraction: data.requireInteraction || false,
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Video Production App', options)
        );
    });

    self.addEventListener('notificationclick', (event) => {
        event.notification.close();
        event.waitUntil(
            clients
                .matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    for (const client of clientList) {
                        if (client.url === '/' && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    if (clients.openWindow) {
                        return clients.openWindow('/');
                    }
                })
        );
    });
}
