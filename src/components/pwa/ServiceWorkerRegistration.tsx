'use client';

import { useEffect } from 'react';

/**
 * Регистрирует Service Worker при первом рендере (только для production).
 * Вставить в корневой layout один раз.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'development') {
        // В dev-режиме удаляем SW, чтобы не кешировались стили и скрипты
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (const registration of registrations) {
            registration.unregister();
            console.log('[SW] Service Worker удален в режиме разработки');
          }
        });
      } else {
        navigator.serviceWorker
          .register('/sw.js')
          .catch(err => console.error('[SW] Ошибка регистрации:', err));
      }
    }
  }, []);

  return null;
}
