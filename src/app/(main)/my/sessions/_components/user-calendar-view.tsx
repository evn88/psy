'use client';

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
  addDays
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
}

export function UserCalendarView({
  currentDate,
  selectedDate,
  events,
  onDateSelect,
  onMonthChange
}: UserCalendarViewProps) {
  const t = useTranslations('My');
  const locale = useLocale();
  const dateLocale = locale === 'ru' ? ru : enUS;

  const nextMonth = () => onMonthChange(addMonths(currentDate, 1));
  const prevMonth = () => onMonthChange(subMonths(currentDate, 1));
  const goToToday = () => {
    onDateSelect(new Date());
    onMonthChange(new Date());
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold capitalize">
            {format(currentDate, 'LLLL yyyy', { locale: dateLocale })}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
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
          className="text-center font-medium text-sm text-muted-foreground py-2 border-b capitalize"
        >
          {format(addDays(startDate, i), 'EEEE', { locale: dateLocale })}
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

        days.push(
          <div
            key={day.toString()}
            onClick={() => onDateSelect(cloneDay)}
            className={`
              min-h-[100px] p-2 border-b border-r cursor-pointer transition-colors relative
              hover:bg-muted/50
              ${!isCurrentMonth ? 'bg-muted/20 text-muted-foreground' : ''}
              ${isSelected ? 'bg-primary/5 border-primary/20' : ''}
              ${i === 6 ? 'border-r-0' : ''}
            `}
          >
            <div className="flex justify-between items-start">
              <span
                className={`
                inline-flex items-center justify-center w-7 h-7 rounded-full text-sm
                ${isToday ? 'bg-primary text-primary-foreground font-bold' : ''}
                ${isSelected && !isToday ? 'bg-muted font-bold' : ''}
              `}
              >
                {formattedDate}
              </span>
              {dayEvents.length > 0 && (
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                  {dayEvents.length}
                </span>
              )}
            </div>

            <div className="mt-2 space-y-1">
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
    return <div className="flex-1 overflow-y-auto">{rows}</div>;
  };

  return (
    <div className="flex flex-col h-full">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
