'use client';

import { useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  startOfMonth,
  startOfWeek,
  subMonths
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import type { AppLocale } from '@/i18n/config';
import { getDateFnsLocale } from '@/lib/date-locale';
import { cn } from '@/lib/utils';

const parseDateKey = (value: string): Date => {
  return new Date(`${value}T12:00:00`);
};

/**
 * Рисует компактный календарь выбора даты для ручного приёма Pillo.
 * @param props - выбранная дата и обработчик изменения.
 * @returns Календарь месяца с навигацией.
 */
export const ManualIntakeDateCalendar = ({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const t = useTranslations('Pillo');
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale as AppLocale);
  const selectedDate = parseDateKey(value);
  const today = parseDateKey(format(new Date(), 'yyyy-MM-dd'));
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate));
  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { locale: dateLocale }),
    end: endOfWeek(monthEnd, { locale: dateLocale })
  });
  const weekDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { locale: dateLocale }),
    end: endOfWeek(monthStart, { locale: dateLocale })
  });

  return (
    <div className="rounded-3xl border border-border/70 bg-white/70 p-3 dark:bg-white/5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => setVisibleMonth(month => subMonths(month, 1))}
          aria-label={t('today.manualTakePreviousMonth')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" />
          {format(visibleMonth, 'LLLL yyyy', { locale: dateLocale })}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => setVisibleMonth(month => addMonths(month, 1))}
          aria-label={t('today.manualTakeNextMonth')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[0.7rem] font-bold uppercase text-muted-foreground">
        {weekDays.map(day => (
          <div key={day.toISOString()} className="py-1">
            {format(day, 'EEEEE', { locale: dateLocale })}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {calendarDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const isSelected = dateKey === value;
          const isOutsideMonth = day.getMonth() !== visibleMonth.getMonth();
          const isFutureDate = isAfter(day, today);

          return (
            <Button
              key={dateKey}
              type="button"
              variant={isSelected ? 'default' : 'ghost'}
              disabled={isFutureDate}
              className={cn(
                'h-9 rounded-full p-0 text-sm font-semibold',
                isOutsideMonth && 'text-muted-foreground/45',
                isFutureDate && 'cursor-not-allowed text-muted-foreground/25 opacity-40',
                isSelected && 'text-primary-foreground shadow-sm'
              )}
              onClick={() => onChange(dateKey)}
              aria-pressed={isSelected}
            >
              {format(day, 'd')}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
