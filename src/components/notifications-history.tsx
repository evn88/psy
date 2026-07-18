'use client';

import { useState } from 'react';
import { BellOff, Check, CircleAlert, Info, Loader2, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { mutate } from 'swr';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import {
  deleteAllNotificationsAction,
  deleteNotificationAction
} from '@/modules/notifications/notification-actions.server';
import type {
  AppNotificationHistoryDto,
  AppNotificationHistoryPage
} from '@/modules/notifications/types';
import { cn } from '@/lib/utils';

interface NotificationsHistoryProps {
  initialPage: AppNotificationHistoryPage;
  isAdmin?: boolean;
}

type DeleteTarget = { type: 'one'; id: string } | { type: 'all' };

const NotificationIcon = ({ notification }: { notification: AppNotificationHistoryDto }) => {
  if (notification.kind === 'WARNING') {
    return <CircleAlert className="size-4 text-amber-700 dark:text-amber-400" aria-hidden />;
  }
  if (notification.kind === 'SUCCESS') {
    return <Check className="size-4 text-emerald-700 dark:text-emerald-400" aria-hidden />;
  }
  return <Info className="size-4 text-primary" aria-hidden />;
};

/** Полная история уведомлений с курсорной пагинацией и административным удалением. */
export const NotificationsHistory = ({
  initialPage,
  isAdmin = false
}: NotificationsHistoryProps) => {
  const t = useTranslations('NotificationsHistory');
  const locale = useLocale();
  const [items, setItems] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const response = await fetch(
        `/api/notifications/history?cursor=${encodeURIComponent(nextCursor)}`,
        { cache: 'no-store' }
      );
      if (!response.ok) {
        throw new Error(t('loadError'));
      }
      const page = (await response.json()) as AppNotificationHistoryPage;
      setItems(current => {
        const currentIds = new Set(current.map(notification => notification.id));
        return [...current, ...page.items.filter(notification => !currentIds.has(notification.id))];
      });
      setNextCursor(page.nextCursor);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('loadError'));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) {
      return;
    }

    const target = deleteTarget;
    setIsDeleting(true);
    try {
      const result =
        target.type === 'all'
          ? await deleteAllNotificationsAction()
          : await deleteNotificationAction(target.id);

      if (!result.success) {
        throw new Error(t('deleteError'));
      }

      if (target.type === 'all') {
        setItems([]);
        setNextCursor(null);
        toast.success(t('allDeleted'));
      } else {
        setItems(current => current.filter(notification => notification.id !== target.id));
        toast.success(t('deleted'));
      }
      await mutate('/api/notifications');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('deleteError'));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getStatus = (notification: AppNotificationHistoryDto) => {
    if (notification.dismissedAt) {
      return { label: t('statuses.cleared'), className: 'text-muted-foreground' };
    }
    if (notification.readAt) {
      return { label: t('statuses.read'), className: 'text-muted-foreground' };
    }
    return { label: t('statuses.unread'), className: 'border-primary/25 text-primary' };
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t('description')}</p>
        </div>
        {isAdmin && items.length > 0 && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-fit text-destructive hover:bg-destructive/10 hover:text-destructive sm:min-h-9"
            onClick={() => setDeleteTarget({ type: 'all' })}
          >
            <Trash2 className="size-4" aria-hidden />
            {t('deleteAll')}
          </Button>
        )}
      </header>

      <section className="overflow-hidden rounded-xl border bg-card" aria-busy={isLoadingMore}>
        {items.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <BellOff className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-semibold">{t('emptyTitle')}</h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
              {t('emptyDescription')}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {items.map(notification => {
              const status = getStatus(notification);
              return (
                <li key={notification.id} className="px-4 py-4 sm:px-5 sm:py-5">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <span
                      className={cn(
                        'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted',
                        notification.kind === 'WARNING' && 'bg-amber-500/10',
                        notification.kind === 'SUCCESS' && 'bg-emerald-500/10'
                      )}
                    >
                      <NotificationIcon notification={notification} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h2 className="text-sm font-semibold leading-5">{notification.title}</h2>
                          <p className="mt-1 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="outline" className={cn('font-normal', status.className)}>
                            {status.label}
                          </Badge>
                          <time
                            dateTime={notification.createdAt}
                            className="text-xs tabular-nums text-muted-foreground"
                          >
                            {dateFormatter.format(new Date(notification.createdAt))}
                          </time>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {notification.actionUrl && notification.actionLabel && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-11 text-xs sm:h-8"
                          >
                            <Link href={notification.actionUrl}>{notification.actionLabel}</Link>
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-11 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-9"
                            onClick={() => setDeleteTarget({ type: 'one', id: notification.id })}
                            aria-label={t('deleteOneAria', { title: notification.title })}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                            {t('deleteOne')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {nextCursor && (
          <div className="flex justify-center border-t p-4">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {isLoadingMore ? t('loadingMore') : t('loadMore')}
            </Button>
          </div>
        )}
      </section>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={open => {
          if (!open && !isDeleting) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === 'all' ? t('confirmAllTitle') : t('confirmOneTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'all'
                ? t('confirmAllDescription')
                : t('confirmOneDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('deleting') : t('confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
