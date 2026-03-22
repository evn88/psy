import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  setHours,
  isBefore,
  startOfDay
} from 'date-fns';
import { useTranslations } from 'next-intl';
import {
  BaseViewProps,
  getEventsForDay,
  getEventStyle,
  getEventDotStyle,
  weekDaysFull,
  weekDaysMobile
} from '../calendar-utils';

export const MonthView = ({
  currentDate,
  selectedDate,
  setSelectedDate,
  events,
  onEventClick,
  direction,
  setDragStart,
  setDragCurrent,
  startH
}: BaseViewProps) => {
  const t = useTranslations('Schedule');
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
          const dayEvents = getEventsForDay(events, day);

          const disabledStyle = isPastDay
            ? {
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(150, 150, 150, 0.06) 8px, rgba(150, 150, 150, 0.06) 16px)'
              }
            : {};

          return (
            <div
              key={idx}
              onMouseDown={() => {
                if (isPastDay) return;
                setSelectedDate(day);
                setDragStart(setHours(day, startH));
                setDragCurrent(setHours(day, startH));
              }}
              className={`min-h-[80px] bg-background p-1 select-none transition-colors flex flex-col gap-1 relative group ${
                !isCurrentMonth ? 'opacity-[0.65]' : ''
              } ${isSelected ? 'bg-muted/30' : 'hover:bg-muted/10'} ${
                isToday ? 'bg-secondary/10' : ''
              } ${isPastDay ? 'cursor-not-allowed opacity-[0.85]' : 'cursor-pointer'}`}
              style={disabledStyle}
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
                {dayEvents.slice(0, 4).map(event => {
                  const eventTypeKey = `types.${event.type}` as Parameters<typeof t>[0];
                  const eventTypeTitle = String(t(eventTypeKey));

                  return (
                    <div
                      key={event.id}
                      className={`text-[10px] xl:text-xs truncate px-1.5 py-0.5 rounded-md text-left transition-opacity hover:opacity-80 border ${getEventStyle(event.type)}`}
                      title={event.title || eventTypeTitle}
                      onMouseDown={e => {
                        e.stopPropagation();
                        if (onEventClick) onEventClick(event);
                      }}
                    >
                      <span className="font-semibold mr-1">
                        {format(new Date(event.start), 'HH:mm')}
                      </span>
                      {event.title || eventTypeTitle}
                    </div>
                  );
                })}
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
