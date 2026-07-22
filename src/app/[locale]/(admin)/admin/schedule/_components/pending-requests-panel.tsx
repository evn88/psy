'use client';

import { useState } from 'react';
import { ArrowUpRight, CalendarClock, Check, LoaderCircle, UserRound, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { PendingRequestRejectionDialog } from './pending-request-rejection-dialog';
import type { Event } from './use-events';

interface PendingRequestsPanelProps {
  requests: Event[];
  isLoading: boolean;
  onApproveRequest: (id: string) => Promise<void>;
  onRejectRequest: (id: string, reason?: string) => Promise<void>;
  onRequestClick?: (event: Event) => void;
  displayTimezone: string;
}

/**
 * Преобразует locale приложения в тег для `Intl.DateTimeFormat`.
 * @param locale - locale из next-intl.
 * @returns BCP 47 тег локали для форматирования дат.
 */
const getLocaleTag = (locale: string): string => {
  if (locale === 'sr') {
    return 'sr-RS';
  }

  if (locale === 'en') {
    return 'en-US';
  }

  return 'ru-RU';
};

/**
 * Форматирует дату события для панели запросов.
 * @param date - дата начала события.
 * @param locale - locale интерфейса.
 * @returns Локализованная строка даты.
 */
const formatRequestDate = (date: Date, locale: string, timeZone: string): string => {
  return new Intl.DateTimeFormat(getLocaleTag(locale), {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

/**
 * Форматирует диапазон времени события для панели запросов.
 * @param start - дата начала.
 * @param end - дата окончания.
 * @param locale - locale интерфейса.
 * @returns Локализованная строка диапазона времени.
 */
const formatRequestTimeRange = (
  start: Date,
  end: Date,
  locale: string,
  timeZone: string
): string => {
  const formatter = new Intl.DateTimeFormat(getLocaleTag(locale), {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
};

/**
 * Отрисовывает боковую панель запросов на подтверждение с действиями approve/reject.
 * @param props - список pending-запросов и обработчики действий.
 * @returns Карточка панели запросов.
 */
export const PendingRequestsPanel = ({
  requests,
  isLoading,
  onApproveRequest,
  onRejectRequest,
  onRequestClick,
  displayTimezone
}: PendingRequestsPanelProps) => {
  const locale = useLocale();
  const t = useTranslations('Schedule');
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [requestToReject, setRequestToReject] = useState<Event | null>(null);

  /**
   * Подтверждает выбранный pending-запрос и показывает toast-результат.
   * @param event - событие, которое нужно подтвердить.
   */
  const handleApprove = async (event: Event): Promise<void> => {
    if (onRequestClick) {
      onRequestClick(event);
      return;
    }

    setActiveRequestId(event.id);

    try {
      await onApproveRequest(event.id);
      toast.success(t('approveRequestSuccess'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('requestActionError');
      toast.error(errorMessage);
    } finally {
      setActiveRequestId(null);
    }
  };

  /**
   * Отклоняет pending-запрос и передаёт необязательную причину в API.
   * @param reason - текст причины отказа.
   */
  const handleReject = async (reason?: string): Promise<void> => {
    if (!requestToReject) {
      return;
    }

    setActiveRequestId(requestToReject.id);

    try {
      await onRejectRequest(requestToReject.id, reason);
      toast.success(t('rejectRequestSuccess'));
      setRequestToReject(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('requestActionError');
      toast.error(errorMessage);
    } finally {
      setActiveRequestId(null);
    }
  };

  return (
    <>
      <Card className="flex flex-col border-border/60 lg:h-full lg:min-h-0">
        <CardHeader className="gap-1 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <CardTitle className="text-base sm:text-lg">{t('pendingRequestsTitle')}</CardTitle>
              <CardDescription>{t('pendingRequestsDescription')}</CardDescription>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {t('pendingRequestsCount', { count: requests.length })}
            </Badge>
          </div>
        </CardHeader>
        <Separator className="opacity-60" />

        <CardContent className="flex min-h-0 flex-1 flex-col bg-muted/15 p-0">
          {isLoading ? (
            <div className="flex min-h-32 items-center px-6 py-8 text-sm text-muted-foreground">
              {t('pendingRequestsLoading')}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex min-h-32 items-center px-6 py-8 text-sm text-muted-foreground">
              {t('pendingRequestsEmpty')}
            </div>
          ) : (
            <ol className="flex max-h-[28rem] flex-col divide-y divide-border/70 overflow-y-auto lg:max-h-full">
              {requests.map(request => {
                const requestTitle = request.title || t(`types.${request.type}` as never);
                const requestClientName = request.user?.name || request.user?.email;
                const shouldShowClientEmail = Boolean(request.user?.name && request.user.email);
                const isActionPending = activeRequestId === request.id;

                return (
                  <li key={request.id} className="px-5 py-5 sm:px-6">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground">
                        <CalendarClock aria-hidden />
                      </div>
                      <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold leading-5">
                            {requestTitle}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {formatRequestDate(new Date(request.start), locale, displayTimezone)} ·{' '}
                            {formatRequestTimeRange(
                              new Date(request.start),
                              new Date(request.end),
                              locale,
                              displayTimezone
                            )}
                          </p>
                        </div>
                        {onRequestClick && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-9 shrink-0"
                            onClick={() => onRequestClick(request)}
                            aria-label={t('openRequest')}
                          >
                            <ArrowUpRight />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex min-w-0 items-start gap-3 text-sm text-muted-foreground">
                      <div className="flex size-10 shrink-0 items-start justify-center pt-0.5">
                        <UserRound aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{requestClientName}</p>
                        {shouldShowClientEmail && (
                          <p className="mt-0.5 truncate text-xs">{request.user?.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        disabled={isActionPending}
                        onClick={() => void handleApprove(request)}
                      >
                        {isActionPending ? (
                          <LoaderCircle data-icon="inline-start" className="animate-spin" />
                        ) : (
                          <Check data-icon="inline-start" />
                        )}
                        {t('approveRequest')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        disabled={isActionPending}
                        onClick={() => setRequestToReject(request)}
                      >
                        <X data-icon="inline-start" />
                        {t('rejectRequest')}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <PendingRequestRejectionDialog
        event={requestToReject}
        open={Boolean(requestToReject)}
        isSubmitting={Boolean(requestToReject && activeRequestId === requestToReject.id)}
        onOpenChange={open => {
          if (!open) {
            setRequestToReject(null);
          }
        }}
        onSubmit={handleReject}
      />
    </>
  );
};
