import { describe, expect, it } from 'vitest';

import {
  calculateConsultationChargePreview,
  getEventDateRange,
  getEventTemporalValues
} from './event-form-utils';

describe('утилиты времени формы расписания', () => {
  it('преобразует локальное время администратора в UTC-интервал', () => {
    const result = getEventDateRange({
      date: '2026-07-16',
      startTime: '10:30',
      duration: 60,
      timeZone: 'America/New_York'
    });

    expect(result.start.toISOString()).toBe('2026-07-16T14:30:00.000Z');
    expect(result.end.toISOString()).toBe('2026-07-16T15:30:00.000Z');
  });

  it('восстанавливает локальные поля формы в часовом поясе администратора', () => {
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

  it('отклоняет несуществующее время при переходе на летний час', () => {
    expect(() =>
      getEventDateRange({
        date: '2026-03-29',
        startTime: '02:30',
        duration: 60,
        timeZone: 'Europe/Belgrade'
      })
    ).toThrow('Указанное локальное время не существует');
  });

  it('рассчитывает стоимость консультации пропорционально длительности', () => {
    expect(calculateConsultationChargePreview('60.00', 30)).toBe('30.00');
    expect(calculateConsultationChargePreview('49.99', 45)).toBe('37.49');
  });

  it('не рассчитывает стоимость для некорректных значений', () => {
    expect(calculateConsultationChargePreview('invalid', 30)).toBeNull();
    expect(calculateConsultationChargePreview('60.00', 0)).toBeNull();
  });
});
