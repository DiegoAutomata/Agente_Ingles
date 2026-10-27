// Service Worker — Agente Inglés PWA
// CRÍTICO: NO incluir fetch handler (rompe iOS Safari PWA)

const CACHE_NAME = 'agente-ingles-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Push: recibir notificación del servidor
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Agente Inglés', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Agente Inglés', {
      body: payload.body || '',
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-72.png',
      data: payload.data || {},
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
    })
  );
});

// Click: navegar a la URL de la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let url = self.location.origin + '/dashboard';
  try {
    const target = new URL(event.notification.data?.url || '/dashboard', self.location.origin);
    if (target.origin === self.location.origin) url = target.href;
  } catch { /* Invalid links fall back to the dashboard. */ }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) client.navigate(url);
            return;
          }
        }
        return self.clients.openWindow(url);
      })
  );
});

// Update: forzar activación de nueva versión
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Renew with the current session, and let open clients retry persistence on failure.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    let ok = false;
    try {
      const options = event.oldSubscription?.options;
      if (!options?.applicationServerKey) throw new Error('Missing subscription options');
      const subscription = await self.registration.pushManager.subscribe(options);
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          oldEndpoint: event.oldSubscription?.endpoint,
        }),
      });
      if (!response.ok || !(await response.json()).success) throw new Error('Subscription not saved');
      ok = true;
    } catch { /* The signed-in page can retry; never claim persistence succeeded. */ }
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach(client => client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED', ok }));
  })());
});
