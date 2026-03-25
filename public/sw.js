/**
 * Service Worker — PWA офлайн-режим + Push уведомления
 *
 * Стратегии кеширования:
 *  - /api/**          → Network Only (никогда не кешировать)
 *  - /_next/static/** → Cache First  (иммутабельные бандлы с хешем)
 *  - HTML-страницы    → Network First → fallback в кеш
 *  - Остальное        → Network First
 *
 * Чтобы добавить новую страницу в офлайн-кеш — добавьте путь в PRE_CACHED_URLS ниже.
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `vershkov-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `vershkov-static-${CACHE_VERSION}`;

/**
 * Страницы, которые будут доступны офлайн.
 * Добавьте сюда новые пути при необходимости.
 */
const PRE_CACHED_URLS = ['/', '/my', '/my/sessions', '/my/surveys'];

const STATIC_ASSETS = [
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  '/favicon.ico'
];

// ─── Install ─────────────────────────────────────────────────────────────────

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(PRE_CACHED_URLS).catch(() => {})),
      caches.open(STATIC_CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
    ]).then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE_NAME && k !== STATIC_CACHE_NAME).map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Только GET запросы и только с нашего домена
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // /api/** — сеть только, никогда не кешировать
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // /_next/static/** — Cache First (иммутабельные бандлы)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    return;
  }

  // Статические иконки и картинки — Cache First
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    return;
  }

  // Всё остальное (HTML-страницы) — Network First с fallback в кеш
  event.respondWith(networkFirst(request));
});

// ─── Стратегии ────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName = STATIC_CACHE_NAME) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Ресурс недоступен офлайн', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Для HTML-запросов возвращаем кешированную главную как fallback
    const fallback = await caches.match('/');
    if (fallback) return fallback;

    return new Response('Нет подключения к интернету', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// ─── Push уведомления ─────────────────────────────────────────────────────────

self.addEventListener('push', event => {
  let data = { title: 'Vershkov.com', body: '' };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? '', {
      body: data.body ?? '',
      icon: '/web-app-manifest-192x192.png',
      badge: '/web-app-manifest-192x192.png',
      tag: 'vershkov-notification',
      renotify: true
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Если приложение уже открыто — фокусируем
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Иначе открываем новую вкладку
      return clients.openWindow('/my');
    })
  );
});

// ─── Background Sync (офлайн-синхронизация опросов) ───────────────────────────

self.addEventListener('sync', event => {
  if (event.tag === 'survey-sync') {
    event.waitUntil(notifyClientToSync());
  }
});

async function notifyClientToSync() {
  const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage({ type: 'SURVEY_SYNC' });
  }
}
