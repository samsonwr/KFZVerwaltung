// Service Worker push event handler
// This file is included via vite-plugin-pwa's workbox configuration

self.addEventListener('push', (event: any) => {
  const data = event.data?.json() ?? { title: 'KFZ Wartung', body: 'Service fällig' }
  event.waitUntil(
    (self as any).registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'kfz-service',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', (event: any) => {
  event.notification.close()
  event.waitUntil(
    (self as any).clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList: any[]) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus()
          }
        }
        if ((self as any).clients.openWindow) {
          return (self as any).clients.openWindow('/')
        }
      })
  )
})
