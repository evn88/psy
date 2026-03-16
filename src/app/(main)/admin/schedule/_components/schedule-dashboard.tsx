'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarView } from './calendar-view';
import { ScheduleDetails } from './schedule-details';
import { useEvents, Event } from './use-events';
import { EventDialog } from './event-dialog';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ScheduleDashboard() {
  const t = useTranslations('Schedule');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dialogDate, setDialogDate] = useState<Date>(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Fetch all events for the currently visible calendar grid
  const { events, isLoading, error, createEvent, updateEvent, deleteEvent } = useEvents(
    startDate,
    endDate
  );

  const handleAddEvent = (date?: Date) => {
    setDialogDate(date || selectedDate || new Date());
    setSelectedEvent(null);
    setIsDialogOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setDialogDate(new Date(event.start));
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
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="w-full xl:w-1/3">
          <Card className="h-full">
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <CardTitle>{t('details')}</CardTitle>
              <Button size="sm" onClick={() => handleAddEvent()}>
                <Plus className="h-4 w-4 mr-1" /> {t('addEvent')}
              </Button>
            </CardHeader>
            <CardContent>
              <ScheduleDetails
                selectedDate={selectedDate}
                viewMode={viewMode}
                setViewMode={setViewMode}
                events={events}
                onEventClick={handleEditEvent}
                onAddEvent={handleAddEvent}
              />
            </CardContent>
          </Card>
        </div>
        <div className="w-full xl:w-2/3">
          <Card className="h-full">
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <CardTitle>{t('calendar')}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => handleAddEvent()}>
                {t('newEvent')}
              </Button>
            </CardHeader>
            <CardContent>
              <CalendarView
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                events={events}
                onEventClick={handleEditEvent}
                onAddEvent={handleAddEvent}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {isDialogOpen && (
        <EventDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          event={selectedEvent}
          selectedDate={dialogDate}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </>
  );
}
