import { describe, expect, it } from 'vitest';

import {
  formatDatePickerValue,
  mergeTimePickerValue,
  parseDatePickerValue,
  parseTimePickerValue
} from '@/lib/date-time-picker';

describe('date-time-picker', () => {
  it('сохраняет календарную дату без изменения дня', () => {
    const date = parseDatePickerValue('2026-07-17');

    expect(date).toBeDefined();
    expect(formatDatePickerValue(date!)).toBe('2026-07-17');
  });

  it('отклоняет несуществующую календарную дату', () => {
    expect(parseDatePickerValue('2026-02-31')).toBeUndefined();
  });

  it('проверяет 24-часовое значение времени', () => {
    expect(parseTimePickerValue('21:05')).toEqual({
      hour: '21',
      minute: '05',
      isValid: true
    });
    expect(parseTimePickerValue('25:70').isValid).toBe(false);
  });

  it('обновляет часы и минуты независимо', () => {
    expect(mergeTimePickerValue('09:30', { hour: '14' })).toBe('14:30');
    expect(mergeTimePickerValue('09:30', { minute: '45' })).toBe('09:45');
    expect(mergeTimePickerValue(null, { hour: '08' })).toBe('08:00');
  });
});
