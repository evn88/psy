'use client';

import { Event } from './use-events';
import { format, isSameDay, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface ScheduleDetailsProps {
  selectedDate: Date;
  viewMode: 'day' | 'week';
  setViewMode: (mode: 'day' | 'week') => void;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onAddEvent?: (date: Date) => void;
}

export const ScheduleDetails = ({
  selectedDate,
  viewMode,
  setViewMode,
  events,
  onEventClick,
  onAddEvent
}: ScheduleDetailsProps) => {
  const t = useTranslations('Schedule');
  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start), day));
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDay(selectedDate);
    // Hourly grid from 8:00 to 20:00 for example
    const hours = Array.from({ length: 13 }, (_, i) => i + 8);

    return (
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4 relative">
          {hours.map(hour => {
            const hourEvents = dayEvents.filter(e => new Date(e.start).getHours() === hour);

            return (
              <div key={hour} className="flex gap-4 group">
                <div className="w-12 text-sm text-right text-muted-foreground pt-2">{hour}:00</div>
                <div className="flex-1 min-h-[60px] border-t border-muted pt-2 relative">
                  {hourEvents.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground"
                      >
                        + Add Event
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {hourEvents.map(event => (
                        <div
                          key={event.id}
                          className="p-2 bg-primary/10 border border-primary/20 rounded-md cursor-pointer hover:bg-primary/20 transition-colors"
                          onClick={() => onEventClick && onEventClick(event)}
                        >
                          <div className="font-semibold text-sm">
                            {event.title || t(`types.${event.type}` as any)}
                          </div>
                          <div className="text-xs text-muted-foreground flex justify-between">
                            <span>
                              {format(new Date(event.start), 'HH:mm')} -{' '}
                              {format(new Date(event.end), 'HH:mm')}
                            </span>
                            <span>{event.user?.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-6">
          <h3 className="font-medium text-lg">
            Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h3>
          {daysInWeek.map(day => {
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`p-4 border rounded-lg ${isToday ? 'border-primary' : ''}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-semibold ${isToday ? 'text-primary' : ''}`}>
                    {format(day, 'EEEE, MMM d')}
                  </span>
                  <span className="text-sm bg-muted px-2 py-0.5 rounded-full">
                    {dayEvents.length} events
                  </span>
                </div>
                {dayEvents.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        className="flex justify-between text-sm items-center py-1 border-b last:border-0 border-muted cursor-pointer hover:bg-muted/50 transition-colors px-1 -mx-1 rounded"
                        onClick={() => onEventClick && onEventClick(event)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {format(new Date(event.start), 'HH:mm')}
                          </span>
                          <span className="font-medium">
                            {event.title || event.type.replace('_', ' ')}
                          </span>
                        </div>
                        {event.user?.name && (
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                            {event.user.name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground mt-2">{t('noEvents')}</div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex bg-muted rounded-md p-1">
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
        </div>

        {viewMode === 'day' && (
          <div className="text-right">
            <h3 className="font-semibold text-lg">{format(selectedDate, 'EEEE')}</h3>
            <p className="text-sm text-muted-foreground">{format(selectedDate, 'MMMM d, yyyy')}</p>
          </div>
        )}
      </div>

      <div className="mt-4">{viewMode === 'day' ? renderDayView() : renderWeekView()}</div>
    </div>
  );
};
