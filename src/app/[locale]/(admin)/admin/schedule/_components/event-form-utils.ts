import { addMinutes } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export type EventTemporalValues = {
  date: string;
  startTime: string;
  duration: number;
};

/**
 * Представляет сохранённый интервал как локальные поля формы в указанном часовом поясе.
 * @param start - начало события в абсолютном времени.
 * @param end - окончание события в абсолютном времени.
 * @param timeZone - IANA timezone клиента.
 * @returns Дата, локальное время начала и длительность в минутах.
 */
export const getEventTemporalValues = (
  start: Date,
  end: Date,
  timeZone: string
): EventTemporalValues => {
  const duration = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60_000));

  return {
    date: formatInTimeZone(start, timeZone, 'yyyy-MM-dd'),
    startTime: formatInTimeZone(start, timeZone, 'HH:mm'),
    duration
  };
};

/**
 * Преобразует локальные поля формы клиента в абсолютный UTC-интервал.
 * @param values - дата, время, длительность и timezone клиента.
 * @returns Начало и окончание события как объекты Date.
 */
export const getEventDateRange = (values: EventTemporalValues & { timeZone: string }) => {
  const start = fromZonedTime(`${values.date}T${values.startTime}:00`, values.timeZone);
  return {
    start,
    end: addMinutes(start, values.duration)
  };
};
