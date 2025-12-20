if (typeof window === 'undefined') {
    self.addEventListener('install', () => {
        self.skipWaiting();
    });

    self.addEventListener('activate', (event) => {
        event.waitUntil(clients.claim());
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
            badge: '/icons/badge-72x72.png',
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
