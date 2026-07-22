'use client';

import { useMemo } from 'react';

import {
  createScheduleDateTime,
  type ScheduleDateTimeService
} from '@/lib/schedule-timezone';

/**
 * Возвращает timezone-bound date-time сервис для интерактивного расписания.
 * Расчёты полностью совпадают с серверным `createScheduleDateTime`.
 * @param timeZone - timezone профиля текущего наблюдателя.
 * @param locale - BCP 47 locale для Intl-форматирования.
 * @returns Мемоизированный сервис форматирования и преобразования времени.
 */
export const useScheduleDateTime = (
  timeZone: string | null | undefined,
  locale = 'en-US'
): ScheduleDateTimeService => {
  return useMemo(() => createScheduleDateTime({ timeZone, locale }), [timeZone, locale]);
};
