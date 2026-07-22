'use client';

import { useEffect, useState } from 'react';
import { EventStatus } from '@prisma/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CalendarView } from './calendar-view';
import { type Event, type EventMutationInput, useEvents } from './use-events';
import { EventDialog } from './event-dialog';
import { PendingRequestsPanel } from './pending-requests-panel';
import { endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toScheduleCalendarDate } from '@/lib/schedule-timezone';

export type ViewMode = 'month' | 'week' | 'day';

interface ScheduleDashboardProps {
  workHourStart?: number;
  workHourEnd?: number;
  adminTimezone: string;
}

/** Восстанавливает календарную дату и мигрирует старое ISO-значение из localStorage. */
const parseStoredCalendarDate = (value: string, timeZone: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseISO(value);
  }

  const storedInstant = new Date(value);
  return Number.isNaN(storedInstant.getTime())
    ? toScheduleCalendarDate(new Date(), timeZone)
    : toScheduleCalendarDate(storedInstant, timeZone);
};

export function ScheduleDashboard({
  workHourStart = 9,
  workHourEnd = 20,
  adminTimezone
}: ScheduleDashboardProps) {
  const t = useTranslations('Schedule');
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('schedule_currentDate');
      if (savedDate) return parseStoredCalendarDate(savedDate, adminTimezone);
    }
    return toScheduleCalendarDate(new Date(), adminTimezone);
  });

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const savedSelected = localStorage.getItem('schedule_selectedDate');
      if (savedSelected) return parseStoredCalendarDate(savedSelected, adminTimezone);
    }
    return toScheduleCalendarDate(new Date(), adminTimezone);
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const savedViewMode = localStorage.getItem('schedule_viewMode') as ViewMode;
      if (savedViewMode && ['month', 'week', 'day'].includes(savedViewMode)) {
        return savedViewMode;
      }
    }
    return 'month';
  });

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) localStorage.setItem('schedule_currentDate', format(currentDate, 'yyyy-MM-dd'));
  }, [currentDate, isMounted]);

  useEffect(() => {
    if (isMounted)
      localStorage.setItem('schedule_selectedDate', format(selectedDate, 'yyyy-MM-dd'));
  }, [selectedDate, isMounted]);

  useEffect(() => {
    if (isMounted) localStorage.setItem('schedule_viewMode', viewMode);
  }, [viewMode, isMounted]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dialogDate, setDialogDate] = useState<Date>(new Date());
  const [dialogEndDate, setDialogEndDate] = useState<Date | undefined>(undefined);

  // Determine fetching boundaries
  // Always fetch the whole month to support the mini-calendar in Day view
  // and enable instant cached navigation between weeks/days.
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const {
    events,
    pendingRequests,
    isValidating,
    isPendingRequestsLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    approvePendingEvent,
    rejectPendingEvent
  } = useEvents(startDate, endDate, adminTimezone);

  const handleAddEvent = (date?: Date, endDate?: Date) => {
    setDialogDate(date || selectedDate || new Date());
    setDialogEndDate(endDate);
    setSelectedEvent(null);
    setIsDialogOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setDialogDate(new Date(event.start));
    setDialogEndDate(new Date(event.end));
    setIsDialogOpen(true);
  };

  const handleSaveEvent = async (data: EventMutationInput) => {
    if (selectedEvent) {
      await updateEvent(selectedEvent.id, data);
    } else {
      await createEvent(data);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteEvent(id);
  };

  /**
   * Фокусирует календарь на событии из боковой панели и открывает редактирование.
   * @param event - событие, выбранное в панели pending-запросов.
   */
  const handleRequestClick = (event: Event) => {
    const eventDate = toScheduleCalendarDate(new Date(event.start), adminTimezone);
    setCurrentDate(eventDate);
    setSelectedDate(eventDate);
    handleEditEvent({
      ...event,
      status:
        event.status === EventStatus.PENDING_CONFIRMATION ? EventStatus.SCHEDULED : event.status
    });
  };

  if (!isMounted) return <div className="min-h-[500px]" />;

  return (
    <>
      <div className="flex flex-col gap-4 lg:grid lg:min-h-[640px] lg:grid-cols-[minmax(0,1fr)_20rem] lg:h-[calc(100vh-10rem)]">
        <Card className="flex min-h-[460px] flex-col border-0 shadow-none sm:border sm:shadow-sm lg:min-h-0 lg:h-full">
          <CardHeader className="px-4 sm:px-6 pb-2 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2 bg-muted p-1 rounded-md">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-sm rounded-sm transition-colors ${
                  viewMode === 'month'
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('month')}
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-sm rounded-sm transition-colors ${
                  viewMode === 'week'
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('week')}
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-sm rounded-sm transition-colors ${
                  viewMode === 'day'
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('day')}
              </button>
            </div>
            <Button size="sm" onClick={() => handleAddEvent()}>
              <Plus className="h-4 w-4 mr-1" />
              <span>{t('createEvent')}</span>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden px-2 sm:px-4 pb-4">
            <CalendarView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              events={events}
              onEventClick={handleEditEvent}
              onAddEvent={handleAddEvent}
              isFetching={isValidating}
              viewMode={viewMode}
              setViewMode={setViewMode}
              workHourStart={workHourStart}
              workHourEnd={workHourEnd}
              displayTimezone={adminTimezone}
            />
          </CardContent>
        </Card>

        <PendingRequestsPanel
          requests={pendingRequests}
          isLoading={isPendingRequestsLoading}
          onApproveRequest={approvePendingEvent}
          onRejectRequest={rejectPendingEvent}
          onRequestClick={handleRequestClick}
          displayTimezone={adminTimezone}
        />
      </div>

      {isDialogOpen && (
        <EventDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          event={selectedEvent}
          selectedDate={dialogDate}
          selectedEndDate={dialogEndDate}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          adminTimezone={adminTimezone}
        />
      )}
    </>
  );
}
