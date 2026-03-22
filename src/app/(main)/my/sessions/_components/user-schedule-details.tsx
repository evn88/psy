'use client';

import { useState } from 'react';
import { format, isSameDay, isSameWeek } from 'date-fns';
import { useTranslations, useLocale } from 'next-intl';
import { ru, enUS } from 'date-fns/locale';
import {
  ListFilter,
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  Video,
  UserCircle,
  MessageSquare
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { UserEvent } from './use-user-events';

interface UserScheduleDetailsProps {
  selectedDate: Date;
  events: UserEvent[];
  viewMode: 'day' | 'week';
  onViewModeChange: (mode: 'day' | 'week') => void;
  isLoading: boolean;
  onBookEvent: (id: string) => Promise<void>;
  onCancelEvent: (id: string, reason?: string) => Promise<void>;
}

export function UserScheduleDetails({
  selectedDate,
  events,
  viewMode,
  onViewModeChange,
  isLoading,
  onBookEvent,
  onCancelEvent
}: UserScheduleDetailsProps) {
  const t = useTranslations('My');
  const locale = useLocale();
  const dateLocale = locale === 'ru' ? ru : enUS;

  const [bookingEventId, setBookingEventId] = useState<string | null>(null);
  const [cancelingEventId, setCancelingEventId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Filter events for selected day or week
  const filteredEvents = events
    .filter(event => {
      const eventDate = new Date(event.start);
      if (viewMode === 'day') {
        return isSameDay(eventDate, selectedDate);
      }
      return isSameWeek(eventDate, selectedDate, { weekStartsOn: 1 });
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const handleBook = async () => {
    if (!bookingEventId) return;
    try {
      setActionLoading(true);
      await onBookEvent(bookingEventId);
      setBookingEventId(null);
    } catch (e) {
      console.error(e);
      // maybe show toast
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelingEventId) return;
    try {
      setActionLoading(true);
      await onCancelEvent(cancelingEventId, cancelReason);
      setCancelingEventId(null);
      setCancelReason('');
    } catch (e) {
      console.error(e);
      // maybe show toast
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Card className="flex flex-col md:h-full border-0 sm:border">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">
                {format(selectedDate, viewMode === 'day' ? 'd MMMM, EEEE' : 'wo MMMM, yyyy', {
                  locale: dateLocale
                })}
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {viewMode === 'day' ? t('daySchedule') : t('weekSchedule')}
              </CardDescription>
            </div>

            <Tabs
              value={viewMode}
              onValueChange={v => onViewModeChange(v as 'day' | 'week')}
              className="hidden sm:block"
            >
              <TabsList className="grid w-[120px] grid-cols-2 h-8">
                <TabsTrigger value="day" className="text-xs">
                  {t('dayTab')}
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs">
                  {t('weekTab')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="sm:hidden mt-4">
            <Tabs value={viewMode} onValueChange={v => onViewModeChange(v as 'day' | 'week')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="day">{t('dayTab')}</TabsTrigger>
                <TabsTrigger value="week">{t('weekTab')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 max-h-[60vh] md:max-h-none">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
              <ListFilter className="h-10 w-10 mb-2 opacity-20" />
              <p>{t('noEvents')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map(event => {
                const startDate = new Date(event.start);
                const endDate = new Date(event.end);

                const isFreeSlot = event.type === 'FREE_SLOT';
                const isScheduled = event.type === 'CONSULTATION' && event.status === 'SCHEDULED';
                const isCancelled = event.status === 'CANCELLED';
                const isPast = new Date(event.start) < new Date();

                return (
                  <div
                    key={event.id}
                    className={`
                      relative p-4 rounded-xl border transition-all
                      ${isFreeSlot ? 'bg-blue-50/50 hover:bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900' : ''}
                      ${isScheduled ? 'bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900 shadow-sm' : ''}
                      ${isCancelled ? 'opacity-60 bg-muted/50' : ''}
                      ${!isFreeSlot && !isScheduled && !isCancelled ? 'bg-card' : ''}
                    `}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isFreeSlot ? 'outline' : isCancelled ? 'secondary' : 'default'}
                          className={`
                            ${isFreeSlot ? 'text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800' : ''}
                            ${isScheduled ? 'bg-green-600 hover:bg-green-700' : ''}
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setBookingEventId(event.id)}
                          >
                            {t('bookButton')}
                          </Button>
                        )}
                        {isScheduled && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setCancelingEventId(event.id)}
                          >
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
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Confirmation Dialog */}
      <Dialog open={!!bookingEventId} onOpenChange={open => !open && setBookingEventId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmBookingTitle')}</DialogTitle>
            <DialogDescription>{t('confirmBookingDesc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBookingEventId(null)}
              disabled={actionLoading}
            >
              {t('cancel')}
            </Button>
            <Button onClick={handleBook} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('confirmButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation Dialog */}
      <Dialog open={!!cancelingEventId} onOpenChange={open => !open && setCancelingEventId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cancelEventTitle')}</DialogTitle>
            <DialogDescription>{t('cancelEventDesc')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">{t('cancelReasonLabel')}</label>
            <Textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder={t('cancelReasonPlaceholder')}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelingEventId(null)}
              disabled={actionLoading}
            >
              {t('keepEventButton')}
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('confirmCancelButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
