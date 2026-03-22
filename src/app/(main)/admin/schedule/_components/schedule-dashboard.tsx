'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarView } from './calendar-view';
import { useEvents, Event } from './use-events';
import { EventDialog } from './event-dialog';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

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

  const { events, isLoading, isValidating, error, createEvent, updateEvent, deleteEvent } =
    useEvents(startDate, endDate);

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

  const handleSaveEvent = async (data: any) => {
    if (selectedEvent) {
      await updateEvent(selectedEvent.id, data);
    } else {
      await createEvent(data);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteEvent(id);
  };

  return (
    <>
      <div className="flex flex-col gap-4 h-[calc(100vh-10rem)] min-h-[500px]">
        <Card className="flex flex-col h-full border-0 shadow-none sm:border sm:shadow-sm">
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
