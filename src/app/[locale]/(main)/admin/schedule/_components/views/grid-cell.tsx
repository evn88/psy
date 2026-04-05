import { isBefore, max, min, setHours, setMinutes } from 'date-fns';

interface GridCellProps {
  day: Date;
  h: number;
  isDayView?: boolean;
  dragStart: Date | null;
  dragCurrent: Date | null;
  setDragStart: (d: Date | null) => void;
  setDragCurrent: (d: Date | null) => void;
  workHourStart: number;
  workHourEnd: number;
}

export const GridCell = ({
  day,
  h,
  isDayView,
  dragStart,
  dragCurrent,
  setDragStart,
  setDragCurrent,
  workHourStart,
  workHourEnd
}: GridCellProps) => {
  const evtDate = setHours(setMinutes(day, 0), h);

  // Используем начало текущего часа для проверки на "прошлое"
  const now = new Date();
  const currentHourStart = setHours(setMinutes(now, 0), now.getHours());
  const isPast = isBefore(evtDate, currentHourStart);

  // Час нерабочий, если он до начала или после (и включая) конца рабочего дня
  const isNonWork = h < workHourStart || h >= workHourEnd;
  const isDisabled = isPast || isNonWork;

  let isSelected = false;
  if (dragStart && dragCurrent && !isDisabled) {
    const start = min([dragStart, dragCurrent]);
    const end = max([dragStart, dragCurrent]);
    isSelected = evtDate >= start && evtDate <= end;
  }

  // Стили для штриховки заблокированных ячеек
  const disabledStyle = isDisabled
    ? {
        backgroundImage:
          'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(150, 150, 150, 0.06) 8px, rgba(150, 150, 150, 0.06) 16px)'
      }
    : {};

  return (
    <div
      className={`${isDayView ? 'h-16' : 'h-12'} shrink-0 border-b border-border/30 transition-colors select-none ${
        isDisabled ? 'cursor-not-allowed opacity-[0.85]' : 'cursor-pointer hover:bg-muted/10'
      } ${isSelected ? 'bg-primary/20 hover:bg-primary/30' : ''}`}
      style={disabledStyle}
      onMouseDown={e => {
        e.stopPropagation();
        if (isDisabled) return;
        setDragStart(evtDate);
        setDragCurrent(evtDate);
      }}
      onMouseEnter={() => {
        if (isDisabled) return;
        if (dragStart) {
          setDragCurrent(evtDate);
        }
      }}
    />
  );
};
