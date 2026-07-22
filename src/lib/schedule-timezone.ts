import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

import { formatUtcOffset, isValidTimeZone } from '@/lib/timezone';

const DEFAULT_TIME_ZONE = 'UTC';

export type ScheduleDateTimeInput = Date | string | number;

export type ScheduleDateTimeStyle =
  | 'date'
  | 'time'
  | 'dateTime'
  | 'shortDateTime'
  | 'numericDateTime'
  | 'numericDate'
  | 'monthDay'
  | 'weekdayDate'
  | 'isoWeekday';

export type ScheduleLocalDateTimeFields = {
  date: string;
  startTime: string;
  duration: number;
};

export type ScheduleDateTimeConversion =
  | { success: true; start: Date; end: Date }
  | { success: false; reason: 'INVALID_LOCAL_TIME' };

export interface ScheduleDateTimeService {
  readonly timeZone: string;
  format: (input: ScheduleDateTimeInput, style: ScheduleDateTimeStyle, locale?: Locale) => string;
  formatIntl: (
    input: ScheduleDateTimeInput,
    options: Intl.DateTimeFormatOptions,
    locale?: string
  ) => string;
  formatRange: (
    start: ScheduleDateTimeInput,
    end: ScheduleDateTimeInput,
    style?: 'time' | 'dateTime',
    locale?: Locale
  ) => string;
  getDateKey: (input: ScheduleDateTimeInput) => string;
  toCalendarDate: (input: ScheduleDateTimeInput) => Date;
  fromCalendarDate: (calendarDate: Date) => Date;
  getLocalDateTimeFields: (
    start: ScheduleDateTimeInput,
    end: ScheduleDateTimeInput
  ) => ScheduleLocalDateTimeFields;
  fromLocalDateTime: (
    fields: ScheduleLocalDateTimeFields | { date: string; startTime: string; duration: number }
  ) => ScheduleDateTimeConversion;
  getUtcOffset: (input?: ScheduleDateTimeInput) => string;
}

const FORMAT_PATTERNS: Record<ScheduleDateTimeStyle, string> = {
  date: 'yyyy-MM-dd',
  time: 'HH:mm',
  dateTime: 'd MMM yyyy, HH:mm',
  shortDateTime: 'd MMM, HH:mm',
  numericDateTime: 'dd.MM.yyyy HH:mm',
  numericDate: 'dd.MM.yyyy',
  monthDay: 'd MMM',
  weekdayDate: 'd MMMM, EEEE',
  isoWeekday: 'i'
};

const toDate = (input: ScheduleDateTimeInput): Date => {
  return input instanceof Date ? input : new Date(input);
};

/**
 * Возвращает валидный IANA-часовой пояс или безопасный UTC fallback.
 * Это единственная нормализация timezone, используемая расписанием.
 * @param timeZone - часовой пояс из профиля пользователя.
 * @returns Нормализованный часовой пояс расписания.
 */
export const resolveScheduleTimeZone = (timeZone: string | null | undefined): string => {
  return timeZone && isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
};

/**
 * Создаёт единый сервис преобразования и форматирования времени расписания.
 * Сервис не зависит от React и одинаково используется в UI, API, email и workflows.
 * @param options - timezone наблюдателя и BCP 47 locale для Intl-форматирования.
 * @returns Набор операций для одного timezone.
 */
export const createScheduleDateTime = (options: {
  timeZone: string | null | undefined;
  locale?: string;
}): ScheduleDateTimeService => {
  const timeZone = resolveScheduleTimeZone(options.timeZone);
  const locale = options.locale || 'en-US';

  const service: ScheduleDateTimeService = {
    timeZone,

    format: (input, style, dateFnsLocale) =>
      formatInTimeZone(toDate(input), timeZone, FORMAT_PATTERNS[style], {
        locale: dateFnsLocale
      }),

    formatIntl: (input, formatOptions, formatLocale = locale) =>
      new Intl.DateTimeFormat(formatLocale, {
        ...formatOptions,
        timeZone
      }).format(toDate(input)),

    formatRange: (start, end, style = 'dateTime', dateFnsLocale) => {
      const startDate = toDate(start);
      const endDate = toDate(end);
      const startText = service.format(startDate, style, dateFnsLocale);
      const endText =
        style === 'time' || service.getDateKey(startDate) === service.getDateKey(endDate)
          ? service.format(endDate, 'time', dateFnsLocale)
          : service.format(endDate, 'dateTime', dateFnsLocale);

      return `${startText} - ${endText}`;
    },

    getDateKey: input => formatInTimeZone(toDate(input), timeZone, 'yyyy-MM-dd'),

    toCalendarDate: input => toZonedTime(toDate(input), timeZone),

    fromCalendarDate: calendarDate => {
      const localDateTime = format(calendarDate, "yyyy-MM-dd'T'HH:mm:ss.SSS");
      return fromZonedTime(localDateTime, timeZone);
    },

    getLocalDateTimeFields: (start, end) => {
      const startDate = toDate(start);
      const endDate = toDate(end);

      return {
        date: service.format(startDate, 'date'),
        startTime: service.format(startDate, 'time'),
        duration: Math.max(15, Math.round((endDate.getTime() - startDate.getTime()) / 60_000))
      };
    },

    fromLocalDateTime: fields => {
      const start = fromZonedTime(`${fields.date}T${fields.startTime}:00`, timeZone);
      const roundTrip = service.format(start, 'date') + ' ' + service.format(start, 'time');

      if (roundTrip !== `${fields.date} ${fields.startTime}`) {
        return { success: false, reason: 'INVALID_LOCAL_TIME' };
      }

      return {
        success: true,
        start,
        end: new Date(start.getTime() + fields.duration * 60_000)
      };
    },

    getUtcOffset: input => {
      const date = input === undefined ? new Date() : toDate(input);
      return formatUtcOffset(timeZone, date);
    }
  };

  return service;
};

/**
 * Проецирует абсолютный момент в техническую Date для календарной сетки.
 * Локальные поля результата соответствуют указанному часовому поясу.
 * @param instant - абсолютный момент времени.
 * @param timeZone - часовой пояс календаря.
 * @returns Date с локальными полями выбранного часового пояса.
 */
export const toScheduleCalendarDate = (instant: Date, timeZone: string): Date => {
  return createScheduleDateTime({ timeZone }).toCalendarDate(instant);
};

/**
 * Интерпретирует локальные поля технической Date календаря в заданном часовом поясе.
 * @param calendarDate - дата из календарной сетки.
 * @param timeZone - часовой пояс календаря.
 * @returns Абсолютный момент времени.
 */
export const fromScheduleCalendarDate = (calendarDate: Date, timeZone: string): Date => {
  return createScheduleDateTime({ timeZone }).fromCalendarDate(calendarDate);
};

/**
 * Возвращает календарный ключ абсолютного момента в указанном часовом поясе.
 * @param instant - абсолютный момент времени.
 * @param timeZone - часовой пояс календаря.
 * @returns Ключ даты формата `yyyy-MM-dd`.
 */
export const getScheduleDateKey = (instant: Date, timeZone: string): string => {
  return createScheduleDateTime({ timeZone }).getDateKey(instant);
};

/**
 * Возвращает ключ технической даты календарной сетки без повторного преобразования timezone.
 * @param calendarDate - дата календарной сетки.
 * @returns Ключ даты формата `yyyy-MM-dd`.
 */
export const getCalendarDateKey = (calendarDate: Date): string => {
  return format(calendarDate, 'yyyy-MM-dd');
};
