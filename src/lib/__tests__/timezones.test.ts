import { describe, expect, it } from 'vitest';

import { filterTimeZones, formatTimeZoneLabel, getSupportedTimeZones } from '@/lib/timezones';

describe('timezones', () => {
  it('находит часовой пояс по городу без учёта регистра', () => {
    const timezones = ['Europe/Belgrade', 'Europe/Moscow', 'America/New_York'];

    expect(filterTimeZones(timezones, 'belGRADE')).toEqual(['Europe/Belgrade']);
  });

  it('находит часовой пояс по составному названию города с пробелом', () => {
    const timezones = ['America/New_York', 'America/Los_Angeles'];

    expect(filterTimeZones(timezones, 'new york')).toEqual(['America/New_York']);
  });

  it('добавляет UTC и возвращает читаемую подпись', () => {
    expect(getSupportedTimeZones()[0]).toBe('UTC');
    expect(formatTimeZoneLabel('America/New_York')).toBe('America/New York');
  });
});
