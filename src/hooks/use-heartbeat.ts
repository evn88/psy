'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { updateUserHeartbeat } from '@/app/actions/user';

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes

export function useHeartbeat() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    // Initial call
    updateUserHeartbeat();

    // Periodic call
    const interval = setInterval(() => {
      // Only update if tab is visible to save resources/requests
      if (document.visibilityState === 'visible') {
        updateUserHeartbeat();
      }
    }, HEARTBEAT_INTERVAL);

    // Listen for visibility change to update immediately when user returns
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateUserHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session]);
}
