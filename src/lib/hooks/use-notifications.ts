'use client';

import useSWR from 'swr';

import type { AppNotificationDto, UseNotificationsResult } from '@/modules/notifications/types';

const NOTIFICATIONS_API_URL = '/api/notifications';
const NOTIFICATIONS_REFRESH_INTERVAL_MS = 5_000;

const fetchNotifications = async (url: string): Promise<AppNotificationDto[]> => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Не удалось загрузить уведомления');
  }
  return response.json() as Promise<AppNotificationDto[]>;
};

const requestOrThrow = async (url: string, init: RequestInit): Promise<void> => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error('Не удалось обновить уведомления');
  }
};

/**
 * Предоставляет независимый доступ к persistent-уведомлениям текущего пользователя.
 * Все экземпляры хука используют общий SWR-кэш, поэтому Provider не требуется.
 * @returns Список, счётчик и optimistic-действия чтения/очистки.
 */
export const useNotifications = (): UseNotificationsResult => {
  const { data, error, isLoading, isValidating, mutate } = useSWR<AppNotificationDto[]>(
    NOTIFICATIONS_API_URL,
    fetchNotifications,
    {
      refreshInterval: NOTIFICATIONS_REFRESH_INTERVAL_MS,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );
  const notifications = data || [];

  const refresh = async (): Promise<void> => {
    await mutate();
  };

  const markAsRead = async (notificationId: string): Promise<void> => {
    await mutate(current => current?.filter(notification => notification.id !== notificationId), {
      revalidate: false
    });
    try {
      await requestOrThrow(`${NOTIFICATIONS_API_URL}/${notificationId}`, { method: 'PATCH' });
    } catch (requestError) {
      await mutate();
      throw requestError;
    }
  };

  const markAllAsRead = async (): Promise<void> => {
    await mutate([], { revalidate: false });
    try {
      await requestOrThrow(`${NOTIFICATIONS_API_URL}/read-all`, { method: 'POST' });
    } catch (requestError) {
      await mutate();
      throw requestError;
    }
  };

  const clearAll = async (): Promise<void> => {
    await mutate([], { revalidate: false });
    try {
      await requestOrThrow(NOTIFICATIONS_API_URL, { method: 'DELETE' });
    } catch (requestError) {
      await mutate();
      throw requestError;
    }
  };

  return {
    notifications,
    unreadCount: notifications.length,
    isLoading,
    isValidating,
    error: error instanceof Error ? error : null,
    refresh,
    markAsRead,
    markAllAsRead,
    clearAll
  };
};
