import { format } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

import { isValidTimeZone } from '@/lib/timezone';

const DEFAULT_TIME_ZONE = 'UTC';

/**
 * Возвращает валидный IANA-часовой пояс или безопасный UTC fallback.
 * @param timeZone - часовой пояс из профиля пользователя.
 * @returns Нормализованный часовой пояс расписания.
 */
export const resolveScheduleTimeZone = (timeZone: string | null | undefined): string => {
  return timeZone && isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
};

/**
 * Проецирует абсолютный момент в техническую Date для календарной сетки.
 * Локальные поля результата соответствуют указанному часовому поясу.
 * @param instant - абсолютный момент времени.
 * @param timeZone - часовой пояс календаря.
 * @returns Date с локальными полями выбранного часового пояса.
 */
export const toScheduleCalendarDate = (instant: Date, timeZone: string): Date => {
  return toZonedTime(instant, resolveScheduleTimeZone(timeZone));
};

/**
 * Интерпретирует локальные поля технической Date календаря в заданном часовом поясе.
 * @param calendarDate - дата из календарной сетки.
 * @param timeZone - часовой пояс календаря.
 * @returns Абсолютный момент времени.
 */
export const fromScheduleCalendarDate = (calendarDate: Date, timeZone: string): Date => {
  const localDateTime = format(calendarDate, "yyyy-MM-dd'T'HH:mm:ss.SSS");
  return fromZonedTime(localDateTime, resolveScheduleTimeZone(timeZone));
};

/**
 * Возвращает календарный ключ абсолютного момента в указанном часовом поясе.
 * @param instant - абсолютный момент времени.
 * @param timeZone - часовой пояс календаря.
 * @returns Ключ даты формата `yyyy-MM-dd`.
 */
export const getScheduleDateKey = (instant: Date, timeZone: string): string => {
  return formatInTimeZone(instant, resolveScheduleTimeZone(timeZone), 'yyyy-MM-dd');
};

/**
 * Возвращает ключ технической даты календарной сетки без повторного преобразования timezone.
 * @param calendarDate - дата календарной сетки.
 * @returns Ключ даты формата `yyyy-MM-dd`.
 */
export const getCalendarDateKey = (calendarDate: Date): string => {
  return format(calendarDate, 'yyyy-MM-dd');
};
