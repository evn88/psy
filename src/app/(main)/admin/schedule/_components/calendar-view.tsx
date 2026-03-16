'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Event } from './use-events';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { useTranslations } from 'next-intl';

interface CalendarViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onAddEvent?: (date: Date) => void;
}

export const CalendarView = ({
  currentDate,
  setCurrentDate,
  selectedDate,
  setSelectedDate,
  events,
  onEventClick,
  onAddEvent
}: CalendarViewProps) => {
  const t = useTranslations('Schedule');
  const handlePreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start), day));
  };

  const getEventStyle = (type: string) => {
    switch (type) {
      case 'FREE_SLOT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'CONSULTATION':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'DAY_OFF':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'VACATION':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'SICK_LEAVE':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'OTHER':
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold capitalize">{format(currentDate, 'MMMM yyyy')}</h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            {t('today')}
          </Button>
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map(day => (
          <div key={day} className="text-sm font-medium text-muted-foreground p-2">
            {day}
          </div>
        ))}

        {daysInMonth.map((day, idx) => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          const dayEvents = getEventsForDay(day);

          return (
            <div
              key={idx}
              onClick={() => setSelectedDate(day)}
              className={`min-h-[100px] border rounded-md p-1 cursor-pointer transition-colors flex flex-col gap-1 ${
                !isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-background'
              } ${isSelected ? 'ring-2 ring-primary ring-inset' : 'hover:bg-muted/50'} ${
                isToday ? 'bg-secondary/20' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <span
                  className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] bg-muted px-1 rounded-sm text-muted-foreground">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1 hide-scrollbar">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className={`text-xs truncate px-1 py-0.5 rounded text-left ${getEventStyle(event.type)} hover:opacity-80 transition-opacity`}
                    title={event.title || t(`types.${event.type}` as any)}
                    onClick={e => {
                      e.stopPropagation();
                      onEventClick && onEventClick(event);
                    }}
                  >
                    {format(new Date(event.start), 'HH:mm')} -{' '}
                    {event.title || t(`types.${event.type}` as any)}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground text-left px-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
