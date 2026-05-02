'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0))) as unknown as BufferSource;
}

export type UsePushNotificationsReturn = {
  /** Браузер поддерживает Web Push API */
  isSupported: boolean;
  /** Текущее разрешение: 'default' | 'granted' | 'denied' */
  permission: NotificationPermission;
  /** Пользователь подписан на push */
  isSubscribed: boolean;
  /** Запросить разрешение и подписаться */
  subscribe: () => Promise<void>;
  /** Отписаться от push */
  unsubscribe: () => Promise<void>;
};

/**
 * Хук для управления Web Push подпиской.
 *
 * Использование:
 * ```tsx
 * const { isSupported, permission, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
 * ```
 */
function isBrowserSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

const subscribeNoop = () => {
  return () => {};
};

export function usePushNotifications(): UsePushNotificationsReturn {
  const isSupported = useSyncExternalStore(subscribeNoop, isBrowserSupported, () => false);
  const permission = useSyncExternalStore<NotificationPermission>(
    subscribeNoop,
    () => (isBrowserSupported() ? Notification.permission : 'default'),
    () => 'default'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionRefreshKey, setPermissionRefreshKey] = useState(0);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    void navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setIsSubscribed(!!sub))
      .catch(() => setIsSubscribed(false));
  }, [isSupported, permissionRefreshKey]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermissionRefreshKey(value => value + 1);

      if (perm !== 'granted') {
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      // Убедимся что нет старой подписки
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const { endpoint, keys } = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth })
      });

      setIsSubscribed(true);
    } catch (err) {
      console.error('[Push] Ошибка подписки:', err);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
        await sub.unsubscribe();
      }

      setIsSubscribed(false);
    } catch (err) {
      console.error('[Push] Ошибка отписки:', err);
    }
  }, []);

  return { isSupported, permission, isSubscribed, subscribe, unsubscribe };
}
