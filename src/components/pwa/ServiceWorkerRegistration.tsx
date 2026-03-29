'use client';

import { useEffect } from 'react';

/**
 * Регистрирует Service Worker при первом рендере.
 * Вставить в корневой layout один раз.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(err => console.error('[SW] Ошибка регистрации:', err));
    }
  }, []);

  return null;
}
