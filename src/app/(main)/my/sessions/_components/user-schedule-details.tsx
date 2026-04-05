'use client';

import { useState } from 'react';
import { isSameDay, isSameWeek } from 'date-fns';
import { useTranslations } from 'next-intl';
import { ListFilter, Loader2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { UserEvent } from './use-user-events';
import { UserScheduleHeader } from './user-schedule-header';
import { UserScheduleEventCard } from './user-schedule-event-card';
import { UserScheduleBookDialog } from './user-schedule-book-dialog';
import { UserScheduleCancelDialog } from './user-schedule-cancel-dialog';
import { UserScheduleRescheduleDialog } from './user-schedule-reschedule-dialog';

interface UserScheduleDetailsProps {
  selectedDate: Date;
  events: UserEvent[];
  viewMode: 'day' | 'week';
  onViewModeChange: (mode: 'day' | 'week') => void;
  isLoading: boolean;
  onBookEvent: (id: string) => Promise<void>;
  onCancelEvent: (id: string, reason?: string) => Promise<void>;
  onRescheduleEvent: (oldId: string, newId: string) => Promise<void>;
}

export function UserScheduleDetails({
  selectedDate,
  events,
  viewMode,
  onViewModeChange,
  isLoading,
  onBookEvent,
  onCancelEvent,
  onRescheduleEvent
}: UserScheduleDetailsProps) {
  const t = useTranslations('My');

  const [bookingEventId, setBookingEventId] = useState<string | null>(null);
  const [cancelingEventId, setCancelingEventId] = useState<string | null>(null);
  const [reschedulingEventId, setReschedulingEventId] = useState<string | null>(null);

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

  return (
    <>
      <Card className="flex flex-col md:h-full border-0 sm:border">
        <UserScheduleHeader
          selectedDate={selectedDate}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />

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
              {filteredEvents.map(event => (
                <UserScheduleEventCard
                  key={event.id}
                  event={event}
                  onBookClick={setBookingEventId}
                  onCancelClick={setCancelingEventId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UserScheduleBookDialog
        eventId={bookingEventId}
        onClose={() => setBookingEventId(null)}
        onConfirm={onBookEvent}
      />

      <UserScheduleCancelDialog
        eventId={cancelingEventId}
        onClose={() => setCancelingEventId(null)}
        onConfirm={onCancelEvent}
        onRequestReschedule={eventId => {
          setCancelingEventId(null);
          setReschedulingEventId(eventId);
        }}
      />

      <UserScheduleRescheduleDialog
        eventId={reschedulingEventId}
        events={events}
        onClose={() => setReschedulingEventId(null)}
        onConfirm={onRescheduleEvent}
      />
    </>
  );
}
