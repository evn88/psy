'use client';

import { useState } from 'react';
import { ArrowRight, Bell, Check, CheckCheck, CircleAlert, Info } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link } from '@/i18n/navigation';
import { useNotifications } from '@/lib/hooks/use-notifications';
import type { AppNotificationDto } from '@/modules/notifications/types';
import { cn } from '@/lib/utils';

const NotificationIcon = ({ notification }: { notification: AppNotificationDto }) => {
  if (notification.kind === 'WARNING') {
    return <CircleAlert className="size-4 text-amber-700 dark:text-amber-400" aria-hidden />;
  }
  if (notification.kind === 'SUCCESS') {
    return <Check className="size-4 text-emerald-700 dark:text-emerald-400" aria-hidden />;
  }
  return <Info className="size-4 text-primary" aria-hidden />;
};

interface AccountNotificationCenterProps {
  historyHref: '/admin/notifications' | '/my/notifications';
}

/**
 * Показывает persistent-уведомления текущего пользователя в верхней панели.
 * Использует общий SWR-кэш хука, поэтому действия синхронизируются с другими модулями.
 */
export const AccountNotificationCenter = ({ historyHref }: AccountNotificationCenterProps) => {
  const t = useTranslations('AccountNotifications');
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const { notifications, unreadCount, isLoading, error, refresh, markAsRead, markAllAsRead } =
    useNotifications();
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  const runAction = async (actionKey: string, action: () => Promise<void>) => {
    setPendingAction(actionKey);
    try {
      await action();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : t('updateError'));
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative size-9 shrink-0 rounded-lg"
          aria-label={t('open')}
        >
          <Bell className="size-4" aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground ring-2 ring-card">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-1rem))] p-0">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{t('title')}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {unreadCount > 0 ? t('unreadCount', { count: unreadCount }) : t('allRead')}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              disabled={Boolean(pendingAction)}
              onClick={() => runAction('read-all', markAllAsRead)}
            >
              <CheckCheck className="size-3.5" aria-hidden />
              {t('readAll')}
            </Button>
          )}
        </div>

        <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('loading')}</p>
          ) : error ? (
            <div className="space-y-2 px-4 py-6 text-center">
              <p className="text-sm text-destructive">{t('loadError')}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refresh()}>
                {t('retry')}
              </Button>
            </div>
          ) : notifications.length > 0 ? (
            <ul className="divide-y">
              {notifications.map(notification => (
                <li key={notification.id} className="p-3">
                  <div
                    className={cn(
                      'rounded-lg border bg-background p-3',
                      notification.kind === 'WARNING' && 'border-amber-500/25 bg-amber-500/10',
                      notification.kind === 'SUCCESS' && 'border-emerald-500/25 bg-emerald-500/10'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        <NotificationIcon notification={notification} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                          {dateFormatter.format(new Date(notification.createdAt))}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {notification.actionUrl && notification.actionLabel && (
                            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                              <Link href={notification.actionUrl} onClick={() => setIsOpen(false)}>
                                {notification.actionLabel}
                              </Link>
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground"
                            disabled={Boolean(pendingAction)}
                            onClick={() =>
                              runAction(notification.id, () => markAsRead(notification.id))
                            }
                          >
                            <Check className="size-3.5" aria-hidden />
                            {t('markRead')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t('empty')}</p>
          )}
        </div>
        <div className="border-t p-2">
          <Button asChild variant="ghost" className="w-full justify-between px-2.5">
            <Link href={historyHref} onClick={() => setIsOpen(false)}>
              {t('viewAll')}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
