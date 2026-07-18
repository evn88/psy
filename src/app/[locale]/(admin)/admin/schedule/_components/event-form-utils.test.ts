import { describe, expect, it } from 'vitest';

import { getEventDateRange, getEventTemporalValues } from './event-form-utils';

describe('утилиты времени формы расписания', () => {
  it('преобразует локальное время клиента в UTC-интервал', () => {
    const result = getEventDateRange({
      date: '2026-07-16',
      startTime: '10:30',
      duration: 60,
      timeZone: 'America/New_York'
    });

    expect(result.start.toISOString()).toBe('2026-07-16T14:30:00.000Z');
    expect(result.end.toISOString()).toBe('2026-07-16T15:30:00.000Z');
  });

  it('восстанавливает локальные поля формы в часовом поясе клиента', () => {
    const result = getEventTemporalValues(
      new Date('2026-12-10T09:15:00.000Z'),
      new Date('2026-12-10T10:45:00.000Z'),
      'Europe/Belgrade'
    );

    expect(result).toEqual({
      date: '2026-12-10',
      startTime: '10:15',
      duration: 90
    });
  });
});
