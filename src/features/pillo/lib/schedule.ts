import { addDays, format, isAfter, isBefore, parseISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

import { PILLO_REMINDER_WINDOW_HOURS, type PilloIsoWeekDay } from './constants';
import { toNumber } from './stock';

export interface PilloScheduleRuleLike {
  id: string;
  userId: string;
  medicationId: string;
  time: string;
  doseUnits: number | string | { toString: () => string };
  daysOfWeek: number[];
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  reminderWorkflowVersion: number;
}

export interface PilloGeneratedIntake {
  userId: string;
  medicationId: string;
  scheduleRuleId: string;
  scheduledFor: Date;
  localDate: string;
  localTime: string;
  doseUnits: number;
  reminderWorkflowVersion: number;
}

/**
 * Возвращает конец rolling window для Pillo.
 * @param now - начало окна.
 * @returns Дата окончания окна.
 */
export const getPilloReminderWindowEnd = (now: Date): Date => {
  return new Date(now.getTime() + PILLO_REMINDER_WINDOW_HOURS * 60 * 60 * 1000);
};

/**
 * Форматирует дату в локальный ключ дня пользователя.
 * @param date - дата в UTC.
 * @param timezone - IANA timezone пользователя.
 * @returns Строка `yyyy-MM-dd`.
 */
export const getPilloLocalDateKey = (date: Date, timezone: string): string => {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
};

/**
 * Возвращает ISO-день недели для локальной даты пользователя.
 * @param localDate - строка `yyyy-MM-dd`.
 * @param timezone - IANA timezone пользователя.
 * @returns День недели 1..7, где 1 - понедельник.
 */
export const getPilloIsoWeekDay = (localDate: string, timezone: string): PilloIsoWeekDay => {
  const localNoon = fromZonedTime(`${localDate}T12:00:00`, timezone);
  return Number(formatInTimeZone(localNoon, timezone, 'i')) as PilloIsoWeekDay;
};

/**
 * Нормализует время приёма до `HH:mm`.
 * @param value - строка времени из формы.
 * @returns Нормализованное время.
 */
export const normalizePilloTime = (value: string): string => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());

  if (!match) {
    throw new Error('Некорректное время приёма');
  }

  return `${match[1]}:${match[2]}`;
};

/**
 * Проверяет, что локальная дата входит в период правила.
 * @param params - правило, локальная дата и timezone пользователя.
 * @returns `true`, если дата подходит под период правила.
 */
const isLocalDateInsideRuleRange = (params: {
  rule: Pick<PilloScheduleRuleLike, 'startDate' | 'endDate'>;
  localDate: string;
  timezone: string;
}): boolean => {
  const startKey = getPilloLocalDateKey(params.rule.startDate, params.timezone);
  const endKey = params.rule.endDate
    ? getPilloLocalDateKey(params.rule.endDate, params.timezone)
    : null;

  if (params.localDate < startKey) {
    return false;
  }

  if (endKey && params.localDate > endKey) {
    return false;
  }

  return true;
};

/**
 * Генерирует будущие приёмы по правилу в пределах rolling window.
 * @param params - правило, timezone пользователя и границы окна.
 * @returns Список приёмов для upsert в БД.
 */
export const generatePilloIntakesForRule = (params: {
  rule: PilloScheduleRuleLike;
  timezone: string;
  windowStart: Date;
  windowEnd?: Date;
}): PilloGeneratedIntake[] => {
  const { rule, timezone, windowStart } = params;
  const windowEnd = params.windowEnd ?? getPilloReminderWindowEnd(windowStart);

  if (!rule.isActive || rule.daysOfWeek.length === 0) {
    return [];
  }

  const localStartKey = getPilloLocalDateKey(windowStart, timezone);
  const localEndKey = getPilloLocalDateKey(windowEnd, timezone);
  const allowedDays = new Set(rule.daysOfWeek);
  const result: PilloGeneratedIntake[] = [];
  let cursor = parseISO(localStartKey);
  const endCursor = parseISO(localEndKey);

  while (!isAfter(cursor, endCursor)) {
    const localDate = format(cursor, 'yyyy-MM-dd');
    const isoWeekDay = getPilloIsoWeekDay(localDate, timezone);

    if (allowedDays.has(isoWeekDay) && isLocalDateInsideRuleRange({ rule, localDate, timezone })) {
      const localTime = normalizePilloTime(rule.time);
      const scheduledFor = fromZonedTime(`${localDate}T${localTime}:00`, timezone);

      if (!isBefore(scheduledFor, windowStart) && !isAfter(scheduledFor, windowEnd)) {
        result.push({
          userId: rule.userId,
          medicationId: rule.medicationId,
          scheduleRuleId: rule.id,
          scheduledFor,
          localDate,
          localTime,
          doseUnits: toNumber(rule.doseUnits),
          reminderWorkflowVersion: rule.reminderWorkflowVersion
        });
      }
    }

    cursor = addDays(cursor, 1);
  }

  return result;
};
