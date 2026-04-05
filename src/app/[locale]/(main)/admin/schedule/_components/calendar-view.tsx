'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Event } from './use-events';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks
} from 'date-fns';
import { useTranslations } from 'next-intl';

import { MonthView } from './views/month-view';
import { WeekView } from './views/week-view';
import { DayView } from './views/day-view';

export interface CalendarViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onAddEvent?: (date: Date, endDate?: Date) => void;
  isFetching?: boolean;
  viewMode: 'month' | 'week' | 'day';
  setViewMode: (mode: 'month' | 'week' | 'day') => void;
  workHourStart?: number;
  workHourEnd?: number;
}

export const CalendarView = ({
  currentDate,
  setCurrentDate,
  selectedDate,
  setSelectedDate,
  events,
  onEventClick,
  onAddEvent,
  viewMode,
  setViewMode,
  workHourStart = 9,
  workHourEnd = 20
}: CalendarViewProps) => {
  const t = useTranslations('Schedule');
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Date | null>(null);

  const handlePrevious = useCallback(() => {
    setDirection('prev');
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  }, [currentDate, viewMode, setCurrentDate]);

  const handleNext = useCallback(() => {
    setDirection('next');
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  }, [currentDate, viewMode, setCurrentDate]);

  const handleToday = () => {
    setDirection(currentDate > new Date() ? 'prev' : 'next');
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const accumulated = useRef(0);
  const cooldown = useRef(false);
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // Horizontal swipe navigation
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (cooldown.current) return;
        accumulated.current += e.deltaX;
        if (Math.abs(accumulated.current) < 120) return;
        const goNext = accumulated.current > 0;
        accumulated.current = 0;
        cooldown.current = true;
        setTimeout(() => {
          cooldown.current = false;
        }, 800);
        if (goNext) handleNext();
        else handlePrevious();
      }
    },
    [handleNext, handlePrevious]
  );

  const handleDragEnd = useCallback(() => {
    if (dragStart && dragCurrent) {
      const minStart = dragStart < dragCurrent ? dragStart : dragCurrent;
      const maxEnd = dragStart > dragCurrent ? dragStart : dragCurrent;
      const end = new Date(maxEnd.getTime() + 60 * 60 * 1000); // add 1 hour
      onAddEvent?.(minStart, end);
    }
    setDragStart(null);
    setDragCurrent(null);
  }, [dragStart, dragCurrent, onAddEvent]);

  useEffect(() => {
    const handleMouseUp = () => handleDragEnd();
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleDragEnd]);

  // Ensure reasonable boundaries with 1 hour padding for better UX
  const startH = Math.max(0, Math.min(23, workHourStart - 1));
  const endH = Math.max(1, Math.min(24, workHourEnd + 1));
  const displayHours = Array.from({ length: Math.max(1, endH - startH) }, (_, i) => i + startH);

  let headerTitle = '';
  if (viewMode === 'month') {
    headerTitle = format(currentDate, 'MMMM yyyy');
  } else if (viewMode === 'week') {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    const we = endOfWeek(currentDate, { weekStartsOn: 1 });
    if (isSameMonth(ws, we)) headerTitle = `${format(ws, 'MMMM yyyy')}`;
    else headerTitle = `${format(ws, 'MMM')} - ${format(we, 'MMM yyyy')}`;
  } else {
    headerTitle = format(currentDate, 'MMMM d, yyyy');
  }

  const baseProps = {
    currentDate,
    setCurrentDate,
    selectedDate,
    setSelectedDate,
    events,
    onEventClick,
    onAddEvent,
    direction,
    dragStart,
    setDragStart,
    dragCurrent,
    setDragCurrent,
    workHourStart,
    workHourEnd,
    startH,
    endH,
    displayHours
  };

  return (
    <div className="space-y-4 h-full flex flex-col" onWheel={handleWheel}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0 px-2 mt-2">
        <h3 className="text-xl sm:text-2xl font-light capitalize truncate min-w-0">
          {headerTitle}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="hidden sm:flex text-sm h-8 px-3"
          >
            {t('today')}
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrevious} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 w-full bg-background border rounded-lg overflow-hidden shadow-sm">
        {viewMode === 'month' && <MonthView {...baseProps} />}
        {viewMode === 'week' && <WeekView {...baseProps} setViewMode={setViewMode} />}
        {viewMode === 'day' && <DayView {...baseProps} />}
      </div>
    </div>
  );
};
