'use client';

import { useCallback, useRef, useState } from 'react';
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
  isFetching?: boolean;
}

const weekDaysFull = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const weekDaysMobile = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const handlePreviousMonth = () => {
    setDirection('prev');
    setCurrentDate(subMonths(currentDate, 1));
  };
  const handleNextMonth = () => {
    setDirection('next');
    setCurrentDate(addMonths(currentDate, 1));
  };
  const handleToday = () => {
    setDirection(currentDate > new Date() ? 'prev' : 'next');
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const accumulated = useRef(0);
  const cooldown = useRef(false);
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (cooldown.current) return;
      accumulated.current += e.deltaY;
      if (Math.abs(accumulated.current) < 120) return;
      const goNext = accumulated.current > 0;
      accumulated.current = 0;
      cooldown.current = true;
      setTimeout(() => {
        cooldown.current = false;
      }, 800);
      if (goNext) {
        setDirection('next');
        setCurrentDate(addMonths(currentDate, 1));
      } else {
        setDirection('prev');
        setCurrentDate(subMonths(currentDate, 1));
      }
    },
    [currentDate, setCurrentDate]
  );

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

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

  const getEventDotStyle = (type: string) => {
    switch (type) {
      case 'FREE_SLOT':
        return 'bg-blue-500';
      case 'CONSULTATION':
        return 'bg-green-500';
      case 'DAY_OFF':
        return 'bg-gray-400';
      case 'VACATION':
        return 'bg-purple-500';
      case 'SICK_LEAVE':
        return 'bg-yellow-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div className="space-y-2 sm:space-y-4 h-full flex flex-col" onWheel={handleWheel}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <h3 className="text-base sm:text-lg font-semibold capitalize truncate min-w-0">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
          >
            {t('today')}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousMonth}
            className="h-7 w-7 sm:h-8 sm:w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            className="h-7 w-7 sm:h-8 sm:w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 text-center shrink-0">
        {weekDaysFull.map((day, i) => (
          <div key={day + i} className="font-medium text-muted-foreground p-1">
            <span className="sm:hidden text-[10px]">{weekDaysMobile[i]}</span>
            <span className="hidden sm:inline text-xs md:text-sm">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        key={currentDate.toISOString()}
        className={`grid grid-cols-7 gap-1 flex-1 overflow-y-auto ${direction === 'next' ? 'animate-calendar-next' : 'animate-calendar-prev'}`}
      >
        {daysInMonth.map((day, idx) => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          const dayEvents = getEventsForDay(day);

          return (
            <div
              key={idx}
              onClick={() => setSelectedDate(day)}
              className={`min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] border rounded-md p-1 cursor-pointer transition-colors flex flex-col gap-1 ${
                !isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-background'
              } ${isSelected ? 'ring-2 ring-primary ring-inset' : 'hover:bg-muted/50'} ${
                isToday ? 'bg-secondary/20' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <span
                  className={`text-xs sm:text-sm font-medium w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-primary text-primary-foreground' : ''
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[9px] sm:text-[10px] bg-muted px-1 rounded-sm text-muted-foreground">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Mobile: colored dots */}
              {dayEvents.length > 0 && (
                <div className="sm:hidden flex flex-wrap gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 4).map(event => (
                    <span
                      key={event.id}
                      className={`w-1.5 h-1.5 rounded-full ${getEventDotStyle(event.type)}`}
                    />
                  ))}
                </div>
              )}

              {/* sm+: text labels */}
              <div className="hidden sm:flex flex-1 overflow-y-auto flex-col gap-1 pr-0.5 hide-scrollbar">
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
