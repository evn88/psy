'use client';

import { format } from 'date-fns';
import { useTranslations, useLocale } from 'next-intl';
import { ru, enUS } from 'date-fns/locale';
import { Clock, Video, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const locale = useLocale();
  const dateLocale = locale === 'ru' ? ru : enUS;

  const startDate = new Date(event.start);
  const endDate = new Date(event.end);

  const isFreeSlot = event.type === 'FREE_SLOT' && !event.userId;
  const isScheduled = event.type === 'CONSULTATION' && event.status === 'SCHEDULED';
  const isPending = event.type === 'CONSULTATION' && event.status === 'PENDING_CONFIRMATION';
  const isCancelled = event.status === 'CANCELLED';
  const isPast = startDate < new Date();

  return (
    <div
      className={`
        relative p-4 rounded-xl border transition-all
        ${isFreeSlot ? 'bg-blue-50/50 hover:bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900' : ''}
        ${isScheduled ? 'bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900 shadow-sm' : ''}
        ${isPending ? 'bg-yellow-50/50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900 shadow-sm' : ''}
        ${isCancelled ? 'opacity-60 bg-muted/50' : ''}
        ${!isFreeSlot && !isScheduled && !isPending && !isCancelled ? 'bg-card' : ''}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <Badge
            variant={isFreeSlot ? 'outline' : isCancelled ? 'secondary' : 'default'}
            className={`
              ${isFreeSlot ? 'text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800' : ''}
              ${isScheduled ? 'bg-green-600 hover:bg-green-700' : ''}
              ${isPending ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
            `}
          >
            {t(`eventTypes.${event.type}` as any)}
          </Badge>
          {isCancelled && (
            <Badge variant="destructive" className="text-[10px] px-1.5 h-5">
              {t(`eventStatuses.${event.status}` as any)}
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          {isFreeSlot && !isPast && !isCancelled && (
            <Button size="sm" variant="outline" onClick={() => onBookClick(event.id)}>
              {t('bookButton')}
            </Button>
          )}
          {(isScheduled || isPending) && (
            <Button size="sm" variant="destructive" onClick={() => onCancelClick(event.id)}>
              {t('cancelButton')}
            </Button>
          )}
        </div>
      </div>

      <h4 className="font-semibold text-base mb-1">
        {event.title || t(`eventTypes.${event.type}` as any)}
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

        {event.meetLink && (
          <div className="flex items-center text-sm mt-3 pt-3 border-t">
            <Video className="w-4 h-4 mr-2 text-primary" />
            <a
              href={event.meetLink}
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
