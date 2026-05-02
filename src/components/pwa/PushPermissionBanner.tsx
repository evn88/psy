'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/lib/hooks/use-push-notifications';

const STORAGE_KEY = 'push_permission_asked';

/**
 * Баннер, который появляется при первом открытии (если разрешение ещё не запрашивалось).
 * Предлагает включить push-уведомления.
 */
export function PushPermissionBanner() {
  const { isSupported, permission, subscribe } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    if (permission !== 'default') return;

    const asked = sessionStorage.getItem(STORAGE_KEY);
    if (!asked) {
      // Небольшая задержка чтобы не показывать сразу при загрузке
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission]);

  const handleAllow = async () => {
    setVisible(false);
    sessionStorage.setItem(STORAGE_KEY, '1');
    await subscribe();
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem(STORAGE_KEY, '1');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm rounded-xl border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold">Уведомления</p>
          <p className="text-xs text-muted-foreground">
            Разрешите уведомления, чтобы получать информацию о сессиях и важных событиях.
          </p>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-7 text-xs" onClick={handleAllow}>
              Разрешить
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleDismiss}>
              Позже
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
