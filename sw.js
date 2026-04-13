/* ═══════════════════════════════════════════════════════════
   RPG VIDA REAL — Service Worker
   Permite instalar la app y funcionar offline
═══════════════════════════════════════════════════════════ */
const CACHE_NAME = 'rpg-vida-v1';

// Archivos que se cachean para uso offline
const PRECACHE = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,400;0,500;1,400&display=swap',
];

// Instalar: cachear archivos esenciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE).catch(() => {
        // Si falla alguna URL externa, igual continúa
        return cache.add('/index.html');
      });
    }).then(() => self.skipWaiting())
  );
});

// Activar: limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network first, caché como fallback
self.addEventListener('fetch', event => {
  // No interceptar llamadas a Supabase API
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar copia en caché si la respuesta es válida
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sin red → servir desde caché
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback final: la app principal
          return caches.match('/index.html');
        });
      })
  );
});

// Push notifications (para recordatorios diarios)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '⚔️ RPG Vida Real';
  const options = {
    body: data.body || '¡Tenés misiones pendientes! El reino te necesita.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
