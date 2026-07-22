'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Clock, MessageSquare, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getDateFnsLocale } from '@/lib/date-locale';
import { getSafeMeetingUrl } from '@/lib/safe-url';
import { useScheduleDateTime } from '@/lib/hooks/use-schedule-date-time';
import type { AppLocale } from '@/i18n/config';
import { UserEvent } from './use-user-events';

interface UserScheduleEventCardProps {
  event: UserEvent;
  onBookClick: (id: string) => void;
  onCancelClick: (id: string) => void;
  userTimezone: string;
}

export function UserScheduleEventCard({
  event,
  onBookClick,
  onCancelClick,
  userTimezone
}: UserScheduleEventCardProps) {
  const t = useTranslations('My');
  const locale = useLocale() as AppLocale;
  const dateLocale = getDateFnsLocale(locale);
  const dateTime = useScheduleDateTime(userTimezone);

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
        relative p-5 rounded-2xl border transition-all duration-300 hover:shadow-md
        ${isFreeSlot ? 'bg-gradient-to-br from-primary/5 via-card/95 to-card border-primary/15 shadow-sm hover:border-primary/30' : ''}
        ${isScheduled ? 'bg-gradient-to-br from-emerald-500/5 via-card/95 to-card border-emerald-500/15 shadow-sm hover:border-emerald-500/30' : ''}
        ${isPending ? 'bg-gradient-to-br from-orange-500/5 via-card/95 to-card border-orange-500/15 shadow-sm hover:border-orange-500/30' : ''}
        ${isCancelled ? 'opacity-60 bg-muted/40 border-border/40 shadow-none' : ''}
        ${!isFreeSlot && !isScheduled && !isPending && !isCancelled ? 'bg-card border-border/60 shadow-sm' : ''}
      `}
    >
      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={isFreeSlot ? 'outline' : isCancelled ? 'secondary' : 'default'}
            className={`
              font-bold text-[10px] px-2 py-0.5 rounded-lg border uppercase tracking-wider
              ${isFreeSlot ? 'text-primary border-primary/30 bg-primary/5' : ''}
              ${isScheduled ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15' : ''}
              ${isPending ? 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/15' : ''}
            `}
          >
            {t(`eventTypes.${event.type}` as never)}
          </Badge>
          {isCancelled && (
            <Badge
              variant="destructive"
              className="text-[10px] px-2 py-0.5 rounded-lg border border-destructive/20 uppercase tracking-wider h-auto"
            >
              {t(`eventStatuses.${event.status}` as never)}
            </Badge>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          {isFreeSlot && !isPast && !isCancelled && (
            <Button
              variant="outline"
              onClick={() => onBookClick(event.id)}
              className="h-11 sm:h-9 px-4 sm:px-4 text-xs rounded-xl font-bold shadow-sm hover:bg-background"
            >
              {t('bookButton')}
            </Button>
          )}
          {(isScheduled || isPending) && (
            <Button
              variant="destructive"
              onClick={() => onCancelClick(event.id)}
              className="h-11 sm:h-9 px-4 sm:px-4 text-xs rounded-xl font-bold shadow-sm"
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
            {dateTime.format(startDate, 'time')} - {dateTime.format(endDate, 'time')}
            <span className="ml-2 text-xs opacity-70">
              ({dateTime.format(startDate, 'monthDay', dateLocale)})
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
