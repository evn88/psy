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

  const { events, isLoading, isValidating, error, createEvent, updateEvent, deleteEvent } =
    useEvents(startDate, endDate);

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
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-[calc(100vh-10rem)] md:min-h-[500px]">
        {/* Calendar — first on mobile, second on desktop */}
        <div className="order-1 md:order-2 flex-1 flex flex-col min-h-0 min-h-[350px] md:min-h-0">
          <Card className="flex flex-col h-auto md:h-full">
            <CardHeader className="px-4 sm:px-6 pb-2 shrink-0">
              <CardTitle className="text-base sm:text-lg">{t('calendar')}</CardTitle>
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
              />
            </CardContent>
          </Card>
        </div>

        {/* Details — second on mobile, first on desktop */}
        <div className="order-2 md:order-1 md:w-80 lg:w-96 md:shrink-0 flex flex-col min-h-0">
          <Card className="flex flex-col h-auto md:h-full">
            <CardHeader className="flex flex-row justify-between items-center pb-2 shrink-0 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg">{t('details')}</CardTitle>
              <Button size="sm" onClick={() => handleAddEvent()}>
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">{t('addEvent')}</span>
              </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-hidden px-4 sm:px-6">
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
