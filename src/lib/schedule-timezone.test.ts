import { describe, expect, it } from 'vitest';

import {
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
});
