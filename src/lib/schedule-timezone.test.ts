import { describe, expect, it } from 'vitest';

import {
  createScheduleDateTime,
  fromScheduleCalendarDate,
  getScheduleDateKey,
  resolveScheduleTimeZone,
  toScheduleCalendarDate
} from '@/lib/schedule-timezone';

describe('часовые пояса расписания', () => {
  it('проецирует один момент на разные локальные даты клиента и администратора', () => {
    const instant = new Date('2026-07-16T22:30:00.000Z');

    expect(getScheduleDateKey(instant, 'Europe/Belgrade')).toBe('2026-07-17');
    expect(getScheduleDateKey(instant, 'America/New_York')).toBe('2026-07-16');
  });

  it('преобразует границу календаря администратора обратно в UTC', () => {
    const calendarDate = toScheduleCalendarDate(
      new Date('2026-12-10T09:15:00.000Z'),
      'Europe/Belgrade'
    );

    expect(fromScheduleCalendarDate(calendarDate, 'Europe/Belgrade').toISOString()).toBe(
      '2026-12-10T09:15:00.000Z'
    );
  });

  it('использует UTC для отсутствующего или некорректного часового пояса', () => {
    expect(resolveScheduleTimeZone(null)).toBe('UTC');
    expect(resolveScheduleTimeZone('Invalid/Timezone')).toBe('UTC');
  });

  it('форматирует абсолютный момент в timezone наблюдателя', () => {
    const dateTime = createScheduleDateTime({ timeZone: 'America/New_York' });
    const instant = new Date('2026-07-16T14:30:00.000Z');

    expect(dateTime.format(instant, 'date')).toBe('2026-07-16');
    expect(dateTime.format(instant, 'time')).toBe('10:30');
    expect(dateTime.format(instant, 'shortDateTime')).toBe('16 Jul, 10:30');
    expect(dateTime.getUtcOffset(instant)).toBe('UTC-4');
  });

  it('определяет завершившийся момент независимо от timezone наблюдателя', () => {
    const reference = new Date('2026-07-16T14:30:00.000Z');
    const belgradeDateTime = createScheduleDateTime({ timeZone: 'Europe/Belgrade' });
    const newYorkDateTime = createScheduleDateTime({ timeZone: 'America/New_York' });

    expect(belgradeDateTime.isPast('2026-07-16T14:29:59.000Z', reference)).toBe(true);
    expect(newYorkDateTime.isPast('2026-07-16T14:30:01.000Z', reference)).toBe(false);
  });

  it('возвращает явный результат для несуществующего локального времени', () => {
    const dateTime = createScheduleDateTime({ timeZone: 'Europe/Belgrade' });

    expect(
      dateTime.fromLocalDateTime({
        date: '2026-03-29',
        startTime: '02:30',
        duration: 60
      })
    ).toEqual({ success: false, reason: 'INVALID_LOCAL_TIME' });
  });
});
