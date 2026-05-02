import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { useTranslations } from 'next-intl';
import { BaseViewProps, getEventsForDay, getEventStyle, weekDaysMobile } from '../calendar-utils';
import { GridCell } from './GridCell';

export const DayView = ({
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
  workHourEnd
}: BaseViewProps) => {
  const t = useTranslations('Schedule');
  const dayEvents = getEventsForDay(events, currentDate);

  // Mini calendar for the right side
  const monthStart = startOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="flex h-full overflow-hidden bg-background rounded-md border">
      {/* Day Schedule */}
      <div
        className={`flex-1 flex flex-col relative overflow-y-auto styled-scrollbar ${
          direction === 'next' ? 'animate-calendar-next' : 'animate-calendar-prev'
        }`}
      >
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50 p-4 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-light">
            {format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h2>
        </div>

        <div className="flex flex-1 relative min-h-max">
          {/* Time column */}
          <div className="w-16 shrink-0 bg-background flex flex-col pointer-events-none z-20 border-r border-border/50">
            {displayHours.map(h => (
              <div
                key={h}
                className="h-16 border-b border-border/50 text-right pr-4 relative flex justify-end shrink-0"
              >
                <span className="text-sm font-medium text-muted-foreground absolute -top-3 right-4 bg-background px-1 leading-none">
                  {h === 0 ? '' : `${h}:00`}
                </span>
              </div>
            ))}
          </div>

          {/* Day column */}
          <div className="flex-1 relative pr-4 lg:pr-6">
            {/* Interactive Grid Cells */}
            <div className="flex flex-col w-full h-full">
              {displayHours.map(h => (
                <GridCell
                  key={h}
                  day={currentDate}
                  h={h}
                  isDayView
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
            <div className="absolute inset-x-0 right-4 lg:right-6 top-0 z-10 pointer-events-none">
              {dayEvents.map(event => {
                const dStart = new Date(event.start);
                const dEnd = new Date(event.end);
                const startMin = dStart.getHours() * 60 + dStart.getMinutes();
                const durationMins = (dEnd.getTime() - dStart.getTime()) / 60000;

                const visibleStartMin = startMin - startH * 60;
                const visibleEndMin = visibleStartMin + durationMins;

                if (visibleEndMin <= 0 || visibleStartMin >= (endH - startH) * 60) return null;

                const top = (visibleStartMin / 60) * 4; // 4rem is h-16 (64px)
                const height = Math.max((durationMins / 60) * 4, 1.5);

                const eventTypeKey = `types.${event.type}` as Parameters<typeof t>[0];
                const eventTypeTitle = String(t(eventTypeKey));

                return (
                  <div
                    key={event.id}
                    onMouseDown={e => {
                      e.stopPropagation();
                      if (onEventClick) onEventClick(event);
                    }}
                    className={`absolute left-2 right-2 rounded-md p-2 text-sm overflow-hidden cursor-pointer shadow-sm hover:shadow-md hover:ring-1 hover:ring-primary/50 transition-all border pointer-events-auto ${getEventStyle(event)}`}
                    style={{
                      top: `${top}rem`,
                      height: `${height}rem`
                    }}
                  >
                    <div className="font-semibold truncate">{event.title || eventTypeTitle}</div>
                    <div className="text-xs opacity-80 mt-1 truncate">
                      {format(dStart, 'HH:mm')} - {format(dEnd, 'HH:mm')}
                    </div>
                    {event.user?.name && (
                      <div className="text-xs font-medium opacity-90 truncate mt-0.5">
                        {event.user.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mini Calendar (Sidebar) */}
      <div className="hidden lg:flex flex-col w-72 shrink-0 border-l border-border/50 p-4 bg-muted/10 overflow-y-auto">
        <div className="font-medium text-sm mb-4 capitalize">
          {format(currentDate, 'MMMM yyyy')}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekDaysMobile.map((day, i) => (
            <div key={i} className="text-xs text-muted-foreground font-medium uppercase">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day, idx) => {
            const isSelected = isSameDay(day, currentDate);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            const hasEvents = getEventsForDay(events, day).length > 0;

            return (
              <div
                key={idx}
                onClick={() => setCurrentDate(day)}
                className={`aspect-square flex items-center justify-center text-sm rounded-full cursor-pointer transition-colors relative
                  ${!isCurrentMonth ? 'text-muted-foreground opacity-50' : 'hover:bg-muted/50'}
                  ${isSelected ? 'bg-primary text-primary-foreground font-medium hover:bg-primary/90 shadow-sm' : ''}
                  ${isToday && !isSelected ? 'text-primary font-bold' : ''}
                `}
              >
                {format(day, 'd')}
                {hasEvents && (
                  <div
                    className={`absolute bottom-1 w-1 h-1 rounded-full ${
                      isSelected ? 'bg-primary-foreground' : 'bg-primary'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
