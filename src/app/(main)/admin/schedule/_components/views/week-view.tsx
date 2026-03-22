import { format, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { useTranslations } from 'next-intl';
import { BaseViewProps, getEventsForDay, getEventStyle } from '../calendar-utils';
import { GridCell } from './grid-cell';

interface WeekViewProps extends BaseViewProps {
  setViewMode: (mode: 'month' | 'week' | 'day') => void;
}

export const WeekView = ({
  currentDate,
  setCurrentDate,
  events,
  onEventClick,
  direction,
  dragStart,
  setDragStart,
  dragCurrent,
  setDragCurrent,
  displayHours,
  startH,
  endH,
  workHourStart,
  workHourEnd,
  setViewMode
}: WeekViewProps) => {
  const t = useTranslations('Schedule');
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div
      className={`flex flex-col h-full bg-background overflow-hidden rounded-md border ${
        direction === 'next' ? 'animate-calendar-next' : 'animate-calendar-prev'
      }`}
    >
      <div className="flex-1 overflow-auto flex flex-col relative w-full styled-scrollbar">
        <div className="min-w-[700px] flex flex-col min-h-full">
          {/* Header Row */}
          <div className="sticky top-0 z-30 flex bg-background/95 backdrop-blur shrink-0 shadow-sm border-b border-border/50">
            {/* Corner element above Time column */}
            <div className="w-12 sm:w-16 shrink-0 border-r border-border/50" />

            {/* Days headers */}
            {daysInWeek.map(day => {
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className="flex-1 min-w-[80px] text-center py-2 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/10 border-r border-border/50 last:border-r-0 transition-colors"
                  onClick={() => {
                    setCurrentDate(day);
                    setViewMode('day');
                  }}
                >
                  <span
                    className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider ${
                      isToday ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {format(day, 'E')}
                  </span>
                  <span
                    className={`text-lg sm:text-xl font-light w-8 h-8 flex items-center justify-center rounded-full mt-1 ${
                      isToday ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grid body */}
          <div className="flex flex-1 relative">
            {/* Time column */}
            <div className="w-12 sm:w-16 shrink-0 bg-background flex flex-col pointer-events-none z-20 border-r border-border/50">
              {displayHours.map(h => (
                <div
                  key={h}
                  className="h-12 border-b border-border/50 text-right pr-2 relative flex justify-end shrink-0"
                >
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground absolute -top-2.5 right-2 bg-background px-1 leading-none">
                    {h === 0 ? '' : `${h}:00`}
                  </span>
                </div>
              ))}
            </div>

            {/* Days columns representing the actual grid */}
            <div className="flex flex-1">
              {daysInWeek.map(day => {
                const dayEvents = getEventsForDay(events, day);

                return (
                  <div
                    key={day.toISOString()}
                    className="flex-1 min-w-[80px] relative border-r border-border/50 last:border-r-0"
                  >
                    {/* Interactive Grid Cells */}
                    <div className="flex flex-col w-full h-full">
                      {displayHours.map(h => (
                        <GridCell
                          key={h}
                          day={day}
                          h={h}
                          dragStart={dragStart}
                          dragCurrent={dragCurrent}
                          setDragStart={setDragStart}
                          setDragCurrent={setDragCurrent}
                          workHourStart={workHourStart}
                          workHourEnd={workHourEnd}
                        />
                      ))}
                    </div>

                    {/* Events Layer */}
                    <div className="absolute inset-x-0 top-0 z-10 pointer-events-none">
                      {dayEvents.map(event => {
                        const dStart = new Date(event.start);
                        const dEnd = new Date(event.end);
                        const startMin = dStart.getHours() * 60 + dStart.getMinutes();
                        const durationMins = (dEnd.getTime() - dStart.getTime()) / 60000;

                        const visibleStartMin = startMin - startH * 60;
                        const visibleEndMin = visibleStartMin + durationMins;

                        // Если событие находится вне видимого диапазона, пропускаем
                        if (visibleEndMin <= 0 || visibleStartMin >= (endH - startH) * 60) {
                          return null;
                        }

                        // Позиционируем (1 час = h-12 = 3rem = 48px)
                        const top = (visibleStartMin / 60) * 3;
                        const height = Math.max((durationMins / 60) * 3, 1.5);

                        // Получаем перевод типа события с проверкой
                        const eventTypeKey = `types.${event.type}` as Parameters<typeof t>[0];
                        const eventTypeTitle = String(t(eventTypeKey));

                        return (
                          <div
                            key={event.id}
                            onMouseDown={e => {
                              // Блокируем всплытие, чтобы не начать Drag на сетке
                              e.stopPropagation();
                              if (onEventClick) onEventClick(event);
                            }}
                            className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md px-1.5 py-1 text-xs flex flex-col overflow-hidden cursor-pointer shadow-sm hover:shadow-md hover:ring-1 hover:ring-primary/50 transition-all border pointer-events-auto ${getEventStyle(event.type)}`}
                            style={{
                              top: `${top}rem`,
                              height: `${height}rem`
                            }}
                          >
                            <span className="font-semibold text-[10px] leading-tight truncate">
                              {event.title || eventTypeTitle}
                            </span>
                            <span className="text-[9px] opacity-80 leading-tight truncate mt-0.5">
                              {format(dStart, 'HH:mm')} - {format(dEnd, 'HH:mm')}
                            </span>
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
      </div>
    </div>
  );
};
