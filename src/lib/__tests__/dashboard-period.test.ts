import { describe, expect, it } from 'vitest';

import {
  getCustomDashboardPeriod,
  getDashboardPeriod,
  parseDashboardPeriod
} from '@/lib/dashboard-period';

describe('dashboard period', () => {
  it('строит текущую неделю с понедельника по воскресенье', () => {
    const period = getDashboardPeriod('week', new Date('2026-07-16T12:00:00.000Z'));
    const parsed = parseDashboardPeriod(period);

    expect(parsed.from.getDay()).toBe(1);
    expect(parsed.to.getDay()).toBe(0);
  });

  it('строит предыдущую календарную неделю', () => {
    const period = parseDashboardPeriod(
      getDashboardPeriod('previousWeek', new Date('2026-07-16T12:00:00.000Z'))
    );

    expect(period.from.getDate()).toBe(6);
    expect(period.to.getDate()).toBe(12);
  });

  it('строит предыдущий календарный месяц', () => {
    const period = parseDashboardPeriod(
      getDashboardPeriod('previousMonth', new Date('2026-07-16T12:00:00.000Z'))
    );

    expect(period.from.getMonth()).toBe(5);
    expect(period.to.getMonth()).toBe(5);
  });

  it('включает целиком обе даты произвольного диапазона', () => {
    const parsed = parseDashboardPeriod(
      getCustomDashboardPeriod(new Date(2026, 6, 1), new Date(2026, 6, 10))
    );

    expect(parsed.from.getHours()).toBe(0);
    expect(parsed.to.getHours()).toBe(23);
  });

  it('отклоняет обратный диапазон', () => {
    expect(() =>
      parseDashboardPeriod({
        from: '2026-07-10T00:00:00.000Z',
        to: '2026-07-01T00:00:00.000Z'
      })
    ).toThrow('Invalid dashboard period');
  });
});
