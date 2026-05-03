'use client';

import { useState } from 'react';
import { CalendarRange, Check, Clock3, Mail, UserRound, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { PendingRequestRejectionDialog } from './pending-request-rejection-dialog';
import type { Event } from './use-events';

interface PendingRequestsPanelProps {
  requests: Event[];
  isLoading: boolean;
  onApproveRequest: (id: string) => Promise<void>;
  onRejectRequest: (id: string, reason?: string) => Promise<void>;
  onRequestClick?: (event: Event) => void;
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
const formatRequestDate = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(getLocaleTag(locale), {
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
const formatRequestTimeRange = (start: Date, end: Date, locale: string): string => {
  const formatter = new Intl.DateTimeFormat(getLocaleTag(locale), {
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
  onRequestClick
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
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg">{t('pendingRequestsTitle')}</CardTitle>
              <CardDescription>{t('pendingRequestsDescription')}</CardDescription>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {t('pendingRequestsCount', { count: requests.length })}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 px-4 pb-4 sm:px-6">
          {isLoading ? (
            <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              {t('pendingRequestsLoading')}
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              {t('pendingRequestsEmpty')}
            </div>
          ) : (
            <div className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto pr-1 lg:max-h-full">
              {requests.map(request => {
                const requestTitle = request.title || t(`types.${request.type}` as never);
                const isActionPending = activeRequestId === request.id;

                return (
                  <article
                    key={request.id}
                    className="rounded-xl border border-border/70 bg-card/60 p-4 transition-colors hover:bg-accent/20"
                  >
                    <div
                      role={onRequestClick ? 'button' : undefined}
                      tabIndex={onRequestClick ? 0 : -1}
                      onClick={() => onRequestClick?.(request)}
                      onKeyDown={event => {
                        if (!onRequestClick) {
                          return;
                        }

                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRequestClick(request);
                        }
                      }}
                      className={onRequestClick ? 'cursor-pointer outline-none' : undefined}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="truncate text-sm font-semibold sm:text-base">
                            {requestTitle}
                          </div>
                          <div className="truncate text-xs text-muted-foreground sm:text-sm">
                            {t(`statuses.${request.status}` as never)}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 border-amber-300 bg-amber-50 text-amber-900"
                        >
                          {t('pendingStatusBadge')}
                        </Badge>
                      </div>

                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <UserRound className="mt-0.5 h-4 w-4 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">
                              {request.user?.name || request.user?.email}
                            </div>
                            {request.user?.email && (
                              <div className="flex items-center gap-1 truncate text-xs sm:text-sm">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{request.user.email}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <CalendarRange className="h-4 w-4 shrink-0" />
                          <span>
                            {t('requestDateLabel')}:{' '}
                            {formatRequestDate(new Date(request.start), locale)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 shrink-0" />
                          <span>
                            {t('requestTimeLabel')}:{' '}
                            {formatRequestTimeRange(
                              new Date(request.start),
                              new Date(request.end),
                              locale
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        size="sm"
                        className="sm:flex-1"
                        disabled={isActionPending}
                        onClick={() => void handleApprove(request)}
                      >
                        <Check className="h-4 w-4" />
                        {t('approveRequest')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="sm:flex-1"
                        disabled={isActionPending}
                        onClick={() => setRequestToReject(request)}
                      >
                        <X className="h-4 w-4" />
                        {t('rejectRequest')}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
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
