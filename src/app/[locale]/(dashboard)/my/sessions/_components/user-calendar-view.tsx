'use client';

import { useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserEvent } from './use-user-events';
import { useLocale, useTranslations } from 'next-intl';
import { getDateFnsLocale } from '@/lib/date-locale';
import type { AppLocale } from '@/i18n/config';
import { useScheduleDateTime } from '@/lib/hooks/use-schedule-date-time';

interface UserCalendarViewProps {
  currentDate: Date;
  selectedDate: Date;
  events: UserEvent[];
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  isFetching?: boolean;
  userTimezone: string;
}

export function UserCalendarView({
  currentDate,
  selectedDate,
  events,
  onDateSelect,
  onMonthChange,
  isFetching = false,
  userTimezone
}: UserCalendarViewProps) {
  const t = useTranslations('My');
  const locale = useLocale() as AppLocale;
  const dateLocale = getDateFnsLocale(locale);
  const dateTime = useScheduleDateTime(userTimezone);

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
    const today = dateTime.toCalendarDate(new Date());
    setDirection(currentDate > today ? 'prev' : 'next');
    onDateSelect(today);
    onMonthChange(today);
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center p-3 sm:p-4 border-b border-border/50 gap-2 bg-muted/5">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold capitalize sm:text-lg">
              {format(currentDate, 'LLLL yyyy', { locale: dateLocale })}
            </h2>
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
              {t('timezoneLabel')}: {userTimezone}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={prevMonth}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="shrink-0 text-xs sm:text-xs h-7 sm:h-8 rounded-lg font-bold hover:bg-background"
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
          className="text-center font-bold text-muted-foreground/80 py-2 border-b border-border/50 bg-muted/5 capitalize"
        >
          <span className="sm:hidden text-[9px] uppercase tracking-wider">
            {format(addDays(startDate, i), 'EEEEE', { locale: dateLocale })}
          </span>
          <span className="hidden sm:inline text-xs uppercase tracking-wider">
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
    const today = dateTime.toCalendarDate(new Date());

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;

        // Find events for this day
        const dayKey = format(cloneDay, 'yyyy-MM-dd');
        const dayEvents = events.filter(
          event => dateTime.getDateKey(new Date(event.start)) === dayKey
        );

        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, today);
        const isPastDay = isBefore(day, startOfDay(today));

        const disabledStyle = isPastDay
          ? {
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(150, 150, 150, 0.04) 8px, rgba(150, 150, 150, 0.04) 16px)'
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
              min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] p-1 sm:p-2 border-b border-r border-border/40 transition-colors relative
              ${!isPastDay ? 'hover:bg-primary/[0.02] cursor-pointer' : 'cursor-not-allowed opacity-[0.85]'}
              ${!isCurrentMonth ? 'bg-muted/10 text-muted-foreground/60' : ''}
              ${isSelected && !isPastDay ? 'bg-primary/[0.04] border-primary/10' : ''}
              ${i === 6 ? 'border-r-0' : ''}
            `}
            style={disabledStyle}
          >
            <div className="flex justify-between items-start">
              <span
                className={`
                inline-flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-full text-xs sm:text-sm transition-all
                ${isToday ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20' : ''}
                ${isSelected && !isToday ? 'bg-primary/10 text-primary font-bold border border-primary/20' : ''}
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
                      className={`w-1.5 h-1.5 rounded-full ${isScheduled ? 'bg-emerald-500' : isFree ? 'bg-primary' : 'bg-muted-foreground/40'}`}
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
                      text-xs p-1 rounded-sm truncate border
                      ${isScheduled ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/15 dark:bg-emerald-500/20 dark:text-emerald-300' : ''}
                      ${isFree ? 'bg-primary/10 text-primary-foreground border-primary/25 dark:bg-primary/20 dark:text-primary-foreground' : ''}
                      ${!isScheduled && !isFree ? 'bg-muted text-muted-foreground border-border/40' : ''}
                    `}
                    title={event.title || t(`eventTypes.${event.type}` as never)}
                  >
                    {dateTime.format(new Date(event.start), 'time')} -{' '}
                    {event.title || t(`eventTypes.${event.type}` as never)}
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
    <div className="flex flex-col h-full">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
