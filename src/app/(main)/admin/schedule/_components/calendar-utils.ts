import { isSameDay } from 'date-fns';
import { Event } from './use-events';

export const weekDaysFull = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const weekDaysMobile = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const getEventStyle = (type: string) => {
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

export const getEventDotStyle = (type: string) => {
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

export const getEventsForDay = (events: Event[], day: Date) => {
  return events.filter(event => isSameDay(new Date(event.start), day));
};

export interface BaseViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onAddEvent?: (date: Date, endDate?: Date) => void;
  direction: 'next' | 'prev';
  dragStart: Date | null;
  setDragStart: (date: Date | null) => void;
  dragCurrent: Date | null;
  setDragCurrent: (date: Date | null) => void;
  workHourStart: number;
  workHourEnd: number;
  startH: number;
  endH: number;
  displayHours: number[];
}
