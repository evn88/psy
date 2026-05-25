'use client';

import { format } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { Clock, MessageSquare, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getDateFnsLocale } from '@/lib/date-locale';
import { getSafeMeetingUrl } from '@/lib/safe-url';
import type { AppLocale } from '@/i18n/config';
import { UserEvent } from './use-user-events';

interface UserScheduleEventCardProps {
  event: UserEvent;
  onBookClick: (id: string) => void;
  onCancelClick: (id: string) => void;
}

export function UserScheduleEventCard({
  event,
  onBookClick,
  onCancelClick
}: UserScheduleEventCardProps) {
  const t = useTranslations('My');
  const locale = useLocale() as AppLocale;
  const dateLocale = getDateFnsLocale(locale);

  const startDate = new Date(event.start);
  const endDate = new Date(event.end);

  const isFreeSlot = event.type === 'FREE_SLOT' && !event.userId;
  const isScheduled = event.type === 'CONSULTATION' && event.status === 'SCHEDULED';
  const isPending = event.type === 'CONSULTATION' && event.status === 'PENDING_CONFIRMATION';
  const isCancelled = event.status === 'CANCELLED';
  const isPast = startDate < new Date();
  const safeMeetLink = getSafeMeetingUrl(event.meetLink);

  return (
    <div
      className={`
        relative p-4 rounded-xl border transition-all duration-200
        ${isFreeSlot ? 'bg-primary/5 border-primary/20 hover:bg-primary/8 dark:bg-primary/8 dark:border-primary/25 shadow-sm' : ''}
        ${isScheduled ? 'bg-emerald-500/5 border-emerald-500/15 dark:bg-emerald-500/10 dark:border-emerald-500/25 shadow-sm' : ''}
        ${isPending ? 'bg-orange-500/5 border-orange-500/15 dark:bg-orange-500/10 dark:border-orange-500/25 shadow-sm' : ''}
        ${isCancelled ? 'opacity-60 bg-muted/50' : ''}
        ${!isFreeSlot && !isScheduled && !isPending && !isCancelled ? 'bg-card' : ''}
      `}
    >
      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={isFreeSlot ? 'outline' : isCancelled ? 'secondary' : 'default'}
            className={`
              font-medium
              ${isFreeSlot ? 'text-primary border-primary/30 dark:text-primary dark:border-primary/50' : ''}
              ${isScheduled ? 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-800' : ''}
              ${isPending ? 'bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700' : ''}
            `}
          >
            {t(`eventTypes.${event.type}` as never)}
          </Badge>
          {isCancelled && (
            <Badge variant="destructive" className="text-[10px] px-1.5 h-5">
              {t(`eventStatuses.${event.status}` as never)}
            </Badge>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          {isFreeSlot && !isPast && !isCancelled && (
            <Button
              variant="outline"
              onClick={() => onBookClick(event.id)}
              className="h-10 sm:h-8 px-4 sm:px-3 text-sm sm:text-xs rounded-xl font-medium"
            >
              {t('bookButton')}
            </Button>
          )}
          {(isScheduled || isPending) && (
            <Button
              variant="destructive"
              onClick={() => onCancelClick(event.id)}
              className="h-10 sm:h-8 px-4 sm:px-3 text-sm sm:text-xs rounded-xl font-medium"
            >
              {t('cancelButton')}
            </Button>
          )}
        </div>
      </div>

      <h4 className="font-semibold text-base mb-1">
        {event.title || t(`eventTypes.${event.type}` as never)}
      </h4>

      <div className="space-y-2 mt-3">
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="w-4 h-4 mr-2 opacity-70" />
          <span>
            {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
            <span className="ml-2 text-xs opacity-70">
              ({format(startDate, 'd MMM', { locale: dateLocale })})
            </span>
          </span>
        </div>

        {event.description && (
          <div className="flex flex-col text-sm text-muted-foreground mt-2 bg-background/50 rounded-md p-2 border">
            <div className="flex items-center mb-1">
              <MessageSquare className="w-4 h-4 mr-2 opacity-70" />
              <span className="font-medium text-xs uppercase tracking-wider">
                {t('detailsLabel')}
              </span>
            </div>
            <p className="pl-6 text-foreground line-clamp-3">{event.description}</p>
          </div>
        )}

        {safeMeetLink && (
          <div className="flex items-center text-sm mt-3 pt-3 border-t">
            <Video className="w-4 h-4 mr-2 text-primary" />
            <a
              href={safeMeetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              {t('joinMeeting')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
