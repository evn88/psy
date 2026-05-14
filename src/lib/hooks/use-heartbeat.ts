'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { updateUserHeartbeat } from '@/lib/user-heartbeat';

const HEARTBEAT_INTERVAL = 30 * 60 * 1000; // 30 минут
const HEARTBEAT_STORAGE_KEY = 'lastHeartbeatAt';

const getLastHeartbeatAt = () => {
  const rawValue = window.localStorage.getItem(HEARTBEAT_STORAGE_KEY);
  const timestamp = rawValue ? Number(rawValue) : 0;

  return Number.isFinite(timestamp) ? timestamp : 0;
};

const shouldUpdateHeartbeat = () => Date.now() - getLastHeartbeatAt() >= HEARTBEAT_INTERVAL;

const markHeartbeatUpdated = () => {
  window.localStorage.setItem(HEARTBEAT_STORAGE_KEY, String(Date.now()));
};

export function useHeartbeat() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    const updateHeartbeatIfNeeded = () => {
      if (document.visibilityState !== 'visible' || !shouldUpdateHeartbeat()) {
        return;
      }

      markHeartbeatUpdated();
      updateUserHeartbeat();
    };

    updateHeartbeatIfNeeded();

    const handleVisibilityChange = () => {
      updateHeartbeatIfNeeded();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session]);
}
