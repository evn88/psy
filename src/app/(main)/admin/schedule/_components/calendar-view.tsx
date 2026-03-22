'use client';

import { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Event } from './use-events';
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  setHours,
  setMinutes,
  isBefore,
  startOfDay,
  addHours,
  min,
  max
} from 'date-fns';
import { useTranslations } from 'next-intl';

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
  onAddEvent,
  viewMode,
  setViewMode
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

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start), day));
  };

  const getEventStyle = (type: string) => {
    switch (type) {
      case 'FREE_SLOT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'CONSULTATION':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'DAY_OFF':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      case 'VACATION':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'SICK_LEAVE':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
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

  const handleDragEnd = useCallback(() => {
    if (dragStart && dragCurrent) {
      const start = min([dragStart, dragCurrent]);
      const end = addHours(max([dragStart, dragCurrent]), 1);
      onAddEvent?.(start, end);
    }
    setDragStart(null);
    setDragCurrent(null);
  }, [dragStart, dragCurrent, onAddEvent]);

  useEffect(() => {
    const handleMouseUp = () => handleDragEnd();
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleDragEnd]);

  // --- Views ---

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    const now = new Date();

    return (
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-7 gap-px bg-border shrink-0 border-b">
          {weekDaysFull.map((day, i) => (
            <div
              key={day + i}
              className="bg-background text-center py-2 font-medium text-muted-foreground"
            >
              <span className="sm:hidden text-xs">{weekDaysMobile[i]}</span>
              <span className="hidden sm:inline text-xs md:text-sm">{day}</span>
            </div>
          ))}
        </div>
        <div
          className={`grid grid-cols-7 gap-px bg-border flex-1 overflow-y-auto ${direction === 'next' ? 'animate-calendar-next' : 'animate-calendar-prev'}`}
        >
          {daysInMonth.map((day, idx) => {
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, now);
            const isPastDay = isBefore(day, startOfDay(now));
            const dayEvents = getEventsForDay(day);

            return (
              <div
                key={idx}
                onMouseDown={() => {
                  if (isPastDay) return;
                  setSelectedDate(day);
                  setDragStart(setHours(day, 9));
                  setDragCurrent(setHours(day, 9));
                }}
                className={`min-h-[80px] bg-background p-1 select-none transition-colors flex flex-col gap-1 relative group ${
                  !isCurrentMonth ? 'opacity-50' : ''
                } ${isSelected ? 'bg-muted/30' : 'hover:bg-muted/10'} ${
                  isToday ? 'bg-secondary/10' : ''
                } ${isPastDay ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
              >
                <div className="flex justify-between items-start pointer-events-none">
                  <span
                    className={`text-xs sm:text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-red-500 text-white' : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Mobile dots */}
                {dayEvents.length > 0 && (
                  <div className="sm:hidden flex flex-wrap gap-0.5 mt-0.5 pointer-events-none">
                    {dayEvents.slice(0, 4).map(event => (
                      <span
                        key={event.id}
                        className={`w-1.5 h-1.5 rounded-full ${getEventDotStyle(event.type)}`}
                      />
                    ))}
                  </div>
                )}

                {/* Desktop labels */}
                <div className="hidden sm:flex flex-1 overflow-y-auto flex-col gap-1 pr-1 hide-scrollbar">
                  {dayEvents.slice(0, 4).map(event => (
                    <div
                      key={event.id}
                      className={`text-[10px] xl:text-xs truncate px-1.5 py-0.5 rounded-md text-left transition-opacity hover:opacity-80 border ${getEventStyle(event.type)}`}
                      title={event.title || t(`types.${event.type}` as any)}
                      onMouseDown={e => {
                        e.stopPropagation();
                        onEventClick && onEventClick(event);
                      }}
                    >
                      <span className="font-semibold mr-1">
                        {format(new Date(event.start), 'HH:mm')}
                      </span>
                      {event.title || t(`types.${event.type}` as any)}
                    </div>
                  ))}
                  {dayEvents.length > 4 && (
                    <div className="text-xs text-muted-foreground pl-1">
                      +{dayEvents.length - 4} ещё
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

  const renderGridCell = (day: Date, h: number, isGridEnd: boolean = false) => {
    const evtDate = setHours(setMinutes(day, 0), h);
    const isPast = isBefore(evtDate, new Date());

    let isSelected = false;
    if (dragStart && dragCurrent) {
      const start = min([dragStart, dragCurrent]);
      const end = max([dragStart, dragCurrent]);
      isSelected = evtDate >= start && evtDate <= end;
    }

    return (
      <div
        key={h}
        className={`h-12 border-b border-border/30 transition-colors select-none ${
          isPast ? 'bg-muted/30 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/10'
        } ${isSelected && !isPast ? 'bg-primary/20 hover:bg-primary/30' : ''}`}
        onMouseDown={e => {
          if (isPast) return;
          e.stopPropagation();
          setDragStart(evtDate);
          setDragCurrent(evtDate);
        }}
        onMouseEnter={() => {
          if (dragStart && !isPast) {
            setDragCurrent(evtDate);
          }
        }}
      />
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex bg-border gap-px border-b shrink-0 pl-12 sm:pl-16 overflow-y-scroll hide-scrollbar mr-[15px]">
          {daysInWeek.map((day, i) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={i}
                className="flex-1 min-w-[50px] bg-background text-center py-2 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/20"
                onClick={() => {
                  setCurrentDate(day);
                  setViewMode('day');
                }}
              >
                <span
                  className={`text-[10px] sm:text-xs font-medium uppercase ${isToday ? 'text-red-500' : 'text-muted-foreground'}`}
                >
                  {format(day, 'E')}
                </span>
                <span
                  className={`text-lg sm:text-xl font-light w-8 h-8 flex items-center justify-center rounded-full mt-1 ${isToday ? 'bg-red-500 text-white' : 'text-foreground'}`}
                >
                  {format(day, 'd')}
                </span>
              </div>
            );
          })}
        </div>
        <div
          className={`flex-1 overflow-y-auto overflow-x-auto bg-border gap-px relative ${direction === 'next' ? 'animate-calendar-next' : 'animate-calendar-prev'}`}
        >
          <div className="flex bg-border gap-px h-auto min-w-max min-h-full">
            {/* Time column */}
            <div className="w-12 sm:w-16 bg-background shrink-0 flex flex-col pointer-events-none z-20">
              {hours.map(h => (
                <div
                  key={h}
                  className="h-12 border-b border-border/50 text-right pr-2 text-xs text-muted-foreground relative"
                >
                  <span className="absolute -top-2.5 right-2 bg-background px-1">
                    {h === 0 ? '' : `${h}:00`}
                  </span>
                </div>
              ))}
            </div>
            {/* Days columns */}
            {daysInWeek.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              // Calculate positioning
              return (
                <div
                  key={i}
                  className="flex-1 min-w-[50px] bg-background relative border-r border-border/50 last:border-r-0 h-max min-h-full pb-12"
                >
                  {/* Grid lines */}
                  <div className="absolute inset-x-0 top-0 z-0">
                    {hours.map(h => renderGridCell(day, h))}
                  </div>
                  {/* Events Layer */}
                  <div className="absolute inset-x-0 top-0 z-10 pointer-events-none">
                    {dayEvents.map(event => {
                      const dStart = new Date(event.start);
                      const dEnd = new Date(event.end);
                      const startMin = dStart.getHours() * 60 + dStart.getMinutes();
                      const durationMins = (dEnd.getTime() - dStart.getTime()) / 60000;
                      const top = (startMin / 60) * 3; // 3rem is h-12 (48px)
                      const height = Math.max((durationMins / 60) * 3, 1.5); // min 1.5rem

                      return (
                        <div
                          key={event.id}
                          onMouseDown={e => {
                            e.stopPropagation();
                            onEventClick && onEventClick(event);
                          }}
                          className={`absolute left-0.5 right-0.5 md:left-1 md:right-1 rounded-md px-1 py-0.5 text-xs overflow-hidden cursor-pointer shadow-sm hover:ring-1 hover:ring-ring transition-all border pointer-events-auto ${getEventStyle(event.type)}`}
                          style={{
                            top: `${top}rem`,
                            height: `${height}rem`
                          }}
                        >
                          <div className="font-semibold text-[10px] leading-tight flex justify-between">
                            <span>{event.title || t(`types.${event.type}` as any)}</span>
                          </div>
                          <div className="text-[9px] opacity-80 leading-tight">
                            {format(dStart, 'HH:mm')} - {format(dEnd, 'HH:mm')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForDay(currentDate);

    // Mini calendar for the right side
    const monthStart = startOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="flex h-full overflow-hidden">
        {/* Day Schedule */}
        <div
          className={`flex-1 flex flex-col bg-background relative overflow-y-auto ${direction === 'next' ? 'animate-calendar-next' : 'animate-calendar-prev'}`}
        >
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b p-4">
            <h2 className="text-2xl font-light">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h2>
          </div>
          <div className="flex relative mt-4 h-max pb-12">
            {/* Time column */}
            <div className="w-16 bg-background shrink-0 flex flex-col pointer-events-none z-20">
              {hours.map(h => (
                <div
                  key={h}
                  className="h-16 border-b border-border/50 text-right pr-4 text-sm text-muted-foreground relative"
                >
                  <span className="absolute -top-3 right-4 bg-background px-1">
                    {h === 0 ? '' : `${h}:00`}
                  </span>
                </div>
              ))}
            </div>
            {/* Day column */}
            <div className="flex-1 relative pr-4">
              <div className="absolute inset-0 right-4 z-0">
                {hours.map(h => {
                  const evtDate = setHours(setMinutes(currentDate, 0), h);
                  const isPast = isBefore(evtDate, new Date());
                  let isSelected = false;
                  if (dragStart && dragCurrent) {
                    const start = min([dragStart, dragCurrent]);
                    const end = max([dragStart, dragCurrent]);
                    isSelected = evtDate >= start && evtDate <= end;
                  }

                  return (
                    <div
                      key={h}
                      className={`h-16 border-b border-border/30 transition-colors select-none ${
                        isPast
                          ? 'bg-muted/30 cursor-not-allowed'
                          : 'cursor-pointer hover:bg-muted/10'
                      } ${isSelected && !isPast ? 'bg-primary/20 hover:bg-primary/30' : ''}`}
                      onMouseDown={e => {
                        if (isPast) return;
                        e.stopPropagation();
                        setDragStart(evtDate);
                        setDragCurrent(evtDate);
                      }}
                      onMouseEnter={() => {
                        if (dragStart && !isPast) {
                          setDragCurrent(evtDate);
                        }
                      }}
                    />
                  );
                })}
              </div>
              {/* Events Layer */}
              <div className="absolute inset-x-0 right-4 top-0 z-10 pointer-events-none">
                {dayEvents.map(event => {
                  const dStart = new Date(event.start);
                  const dEnd = new Date(event.end);
                  const startMin = dStart.getHours() * 60 + dStart.getMinutes();
                  const durationMins = (dEnd.getTime() - dStart.getTime()) / 60000;
                  const top = (startMin / 60) * 4; // 4rem is h-16 (64px)
                  const height = Math.max((durationMins / 60) * 4, 2);

                  return (
                    <div
                      key={event.id}
                      onMouseDown={e => {
                        e.stopPropagation();
                        onEventClick && onEventClick(event);
                      }}
                      className={`absolute left-2 right-6 rounded-md p-2 text-sm overflow-hidden cursor-pointer shadow-sm hover:ring-1 hover:ring-ring transition-all border pointer-events-auto ${getEventStyle(event.type)}`}
                      style={{
                        top: `${top}rem`,
                        height: `${height}rem`
                      }}
                    >
                      <div className="font-semibold">
                        {event.title || t(`types.${event.type}` as any)}
                      </div>
                      <div className="text-xs opacity-80 mt-1">
                        {format(dStart, 'HH:mm')} - {format(dEnd, 'HH:mm')}
                        {event.user?.name && ` • ${event.user.name}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mini Calendar (Sidebar) */}
        <div className="hidden lg:block w-72 shrink-0 border-l p-4 bg-muted/10 overflow-y-auto">
          <div className="font-medium text-sm mb-4">{format(currentDate, 'MMMM yyyy')}</div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {weekDaysMobile.map((day, i) => (
              <div key={i} className="text-xs text-muted-foreground font-medium">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((day, idx) => {
              const isSelected = isSameDay(day, currentDate);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());
              const hasEvents = getEventsForDay(day).length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => setCurrentDate(day)}
                  className={`aspect-square flex items-center justify-center text-sm rounded-full cursor-pointer transition-colors relative
                    ${!isCurrentMonth ? 'text-muted-foreground opacity-50' : 'hover:bg-muted'}
                    ${isSelected ? 'bg-primary text-primary-foreground font-medium hover:bg-primary/90' : ''}
                    ${isToday && !isSelected ? 'text-red-500 font-bold' : ''}
                  `}
                >
                  {format(day, 'd')}
                  {hasEvents && !isSelected && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---

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
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>
    </div>
  );
};
