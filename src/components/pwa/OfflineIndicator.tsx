'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Маленький индикатор внизу экрана, когда пользователь офлайн.
 * Слушает события window 'online' / 'offline'.
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(() =>
    typeof window !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Офлайн режим</span>
    </div>
  );
}
