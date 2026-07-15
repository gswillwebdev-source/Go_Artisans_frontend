// GoArtisans Service Worker — handles push notifications
self.addEventListener('push', event => {
    const data = event.data?.json() || {}
    const title = data.title || 'GoArtisans'
    const body = data.body || 'You have a new notification'
    const icon = data.icon || '/app_icon.png'
    const url = data.url || '/messages'

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon,
            badge: '/app_icon.png',
            tag: data.tag || 'goartisans',
            data: { url },
            vibrate: [200, 100, 200],
        })
    )
})

self.addEventListener('notificationclick', event => {
    event.notification.close()
    const url = event.notification.data?.url || '/messages'
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            const existing = windowClients.find(c => c.url.includes(self.location.origin))
            if (existing) { existing.focus(); existing.navigate(url) }
            else clients.openWindow(url)
        })
    )
})
