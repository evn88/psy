'use client';

import { useCallback, useRef, useState } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  isBefore,
  startOfDay
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserEvent } from './use-user-events';
import { useTranslations, useLocale } from 'next-intl';
import { ru, enUS } from 'date-fns/locale';

interface UserCalendarViewProps {
  currentDate: Date;
  selectedDate: Date;
  events: UserEvent[];
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  isFetching?: boolean;
}

export function UserCalendarView({
  currentDate,
  selectedDate,
  events,
  onDateSelect,
  onMonthChange,
  isFetching = false
}: UserCalendarViewProps) {
  const t = useTranslations('My');
  const locale = useLocale();
  const dateLocale = locale === 'ru' ? ru : enUS;

  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const nextMonth = () => {
    setDirection('next');
    onMonthChange(addMonths(currentDate, 1));
  };
  const prevMonth = () => {
    setDirection('prev');
    onMonthChange(subMonths(currentDate, 1));
  };
  const goToToday = () => {
    setDirection(currentDate > new Date() ? 'prev' : 'next');
    onDateSelect(new Date());
    onMonthChange(new Date());
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
        onMonthChange(addMonths(currentDate, 1));
      } else {
        setDirection('prev');
        onMonthChange(subMonths(currentDate, 1));
      }
    },
    [currentDate, onMonthChange]
  );

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center p-3 sm:p-4 border-b gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <h2 className="text-base sm:text-xl font-semibold capitalize truncate">
            {format(currentDate, 'LLLL yyyy', { locale: dateLocale })}
          </h2>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={prevMonth}
              className="h-7 w-7 sm:h-8 sm:w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="h-7 w-7 sm:h-8 sm:w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="shrink-0 text-xs sm:text-sm h-7 sm:h-8"
        >
          {t('today')}
        </Button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });

    for (let i = 0; i < 7; i++) {
      days.push(
        <div
          key={i}
          className="text-center font-medium text-muted-foreground py-2 border-b capitalize"
        >
          <span className="sm:hidden text-[10px]">
            {format(addDays(startDate, i), 'EEEEE', { locale: dateLocale })}
          </span>
          <span className="hidden sm:inline text-xs md:text-sm">
            {format(addDays(startDate, i), 'EEE', { locale: dateLocale })}
          </span>
        </div>
      );
    }
    return <div className="grid grid-cols-7">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;

        // Find events for this day
        const dayEvents = events.filter(e => isSameDay(new Date(e.start), cloneDay));

        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());
        const isPastDay = isBefore(day, startOfDay(new Date()));

        const disabledStyle = isPastDay
          ? {
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(150, 150, 150, 0.06) 8px, rgba(150, 150, 150, 0.06) 16px)'
            }
          : {};

        days.push(
          <div
            key={day.toString()}
            onClick={() => {
              if (isPastDay) return;
              onDateSelect(cloneDay);
            }}
            className={`
              min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] p-1 sm:p-2 border-b border-r transition-colors relative
              ${!isPastDay ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-not-allowed opacity-[0.85]'}
              ${!isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : ''}
              ${isSelected && !isPastDay ? 'bg-primary/5 border-primary/20' : ''}
              ${i === 6 ? 'border-r-0' : ''}
            `}
            style={disabledStyle}
          >
            <div className="flex justify-between items-start">
              <span
                className={`
                inline-flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-full text-xs sm:text-sm
                ${isToday ? 'bg-primary text-primary-foreground font-bold' : ''}
                ${isSelected && !isToday ? 'bg-muted font-bold' : ''}
              `}
              >
                {formattedDate}
              </span>
              {dayEvents.length > 0 && (
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground bg-muted px-1 sm:px-1.5 py-0.5 rounded-sm">
                  {dayEvents.length}
                </span>
              )}
            </div>

            {/* Mobile: colored dots */}
            {dayEvents.length > 0 && (
              <div className="sm:hidden flex flex-wrap gap-0.5 mt-1">
                {dayEvents.slice(0, 4).map(event => {
                  const isScheduled = event.type === 'CONSULTATION' && event.status === 'SCHEDULED';
                  const isFree = event.type === 'FREE_SLOT';
                  return (
                    <span
                      key={event.id}
                      className={`w-1.5 h-1.5 rounded-full ${isScheduled ? 'bg-green-500' : isFree ? 'bg-blue-500' : 'bg-gray-400'}`}
                    />
                  );
                })}
              </div>
            )}

            {/* sm+: text labels */}
            <div className="hidden sm:block mt-1 sm:mt-2 space-y-1">
              {dayEvents.slice(0, 3).map(event => {
                const isScheduled = event.type === 'CONSULTATION' && event.status === 'SCHEDULED';
                const isFree = event.type === 'FREE_SLOT';

                return (
                  <div
                    key={event.id}
                    className={`
                      text-xs p-1 rounded-sm truncate
                      ${isScheduled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}
                      ${isFree ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                      ${!isScheduled && !isFree ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' : ''}
                    `}
                    title={event.title || t(`eventTypes.${event.type}` as any)}
                  >
                    {format(new Date(event.start), 'HH:mm')} -{' '}
                    {event.title || t(`eventTypes.${event.type}` as any)}
                  </div>
                );
              })}
              {dayEvents.length > 3 && (
                <div className="text-xs text-muted-foreground pl-1">
                  +{dayEvents.length - 3} {t('more')}
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }
    return (
      <div
        key={currentDate.toISOString()}
        className={`flex-1 overflow-y-auto ${direction === 'next' ? 'animate-calendar-next' : 'animate-calendar-prev'}`}
      >
        {rows}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full" onWheel={handleWheel}>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
