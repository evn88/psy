'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CalendarView } from './CalendarView';
import { type Event, type EventMutationInput, useEvents } from './use-events';
import { EventDialog } from './EventDialog';
import { PendingRequestsPanel } from './PendingRequestsPanel';
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type ViewMode = 'month' | 'week' | 'day';

interface ScheduleDashboardProps {
  workHourStart?: number;
  workHourEnd?: number;
}

export function ScheduleDashboard({ workHourStart = 9, workHourEnd = 20 }: ScheduleDashboardProps) {
  const t = useTranslations('Schedule');
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('schedule_currentDate');
      if (savedDate) return new Date(savedDate);
    }
    return new Date();
  });

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const savedSelected = localStorage.getItem('schedule_selectedDate');
      if (savedSelected) return new Date(savedSelected);
    }
    return new Date();
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
    if (isMounted) localStorage.setItem('schedule_currentDate', currentDate.toISOString());
  }, [currentDate, isMounted]);

  useEffect(() => {
    if (isMounted) localStorage.setItem('schedule_selectedDate', selectedDate.toISOString());
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
  } = useEvents(startDate, endDate);

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
    setCurrentDate(new Date(event.start));
    setSelectedDate(new Date(event.start));
    handleEditEvent(event);
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
            />
          </CardContent>
        </Card>

        <PendingRequestsPanel
          requests={pendingRequests}
          isLoading={isPendingRequestsLoading}
          onApproveRequest={approvePendingEvent}
          onRejectRequest={rejectPendingEvent}
          onRequestClick={handleRequestClick}
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
        />
      )}
    </>
  );
}
