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

        // Skip HTML/document and Next.js data to avoid serving stale shells
        const accept = request.headers.get('accept') || '';
        const isHTML = request.destination === 'document' || accept.includes('text/html');
        const isNextData = url.pathname.startsWith('/_next/data');
        if (isHTML || isNextData) return;

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
        console.log("🔄 SW: message received", event.data);
        if (event.data && event.data.type === 'SKIP_WAITING') {
            console.log("🔄 SW: SKIP_WAITING - activating new worker");
            self.skipWaiting();
        }
    });

    self.addEventListener('push', (event) => {
        console.log('📬 Push event received:', event);
        
        let data = {};
        if (event.data) {
            try {
                data = event.data.json();
            } catch (e) {
                console.warn('Failed to parse push data as JSON:', e);
                data = { body: event.data.text() };
            }
        }

        const options = {
            body: data.body || 'New notification',
            icon: data.icon || '/icons/icon-192x192.png',
            badge: data.badge || '/icons/icon-192x192.png',
            image: data.image,
            tag: data.tag || 'notification',
            requireInteraction: data.requireInteraction || false,
            vibrate: data.vibrate || [200, 100, 200],
            actions: [
                {
                    action: 'open',
                    title: 'Open Chat',
                    icon: '/icons/icon-192x192.png'
                },
                {
                    action: 'close',
                    title: 'Dismiss'
                }
            ],
            data: {
                url: data.data?.url || '/dashboard/chat',
                timestamp: data.data?.timestamp || Date.now(),
                ...data.metadata,
            },
        };

        console.log('🔔 Showing notification:', {
            title: data.title || 'Video Production App',
            options,
        });

        // Notify all open clients about the notification
        event.waitUntil(
            Promise.all([
                self.registration.showNotification(data.title || 'Video Production App', options),
                self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
                    clients.forEach((client) => {
                        client.postMessage({
                            type: 'NOTIFICATION_RECEIVED',
                            data: { title: data.title, body: data.body }
                        });
                    });
                })
            ])
        );
    });

    self.addEventListener('notificationclick', (event) => {
        console.log('✅ Notification clicked:', event.notification.tag);
        event.notification.close();
        
        const url = (event.notification.data && event.notification.data.url) || '/';
        
        event.waitUntil(
            clients
                .matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // Look for existing window
                    for (const client of clientList) {
                        if (client.url === url && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // Fall back to home or create new window
                    if (clients.openWindow) {
                        return clients.openWindow(url);
                    }
                })
        );
    });

    self.addEventListener('notificationclose', (event) => {
        console.log('❌ Notification closed:', event.notification.tag);
    });
