import { describe, expect, it } from 'vitest';

import { pilloScheduleRuleSchema } from '../schemas';

describe('Pillo schemas', () => {
  it('принимает дробное количество за приём в расписании', () => {
    // Arrange
    const input = {
      medicationId: 'medication-1',
      time: '09:00',
      doseUnits: '1/2',
      daysOfWeek: [1, 2, 3],
      startDate: '2026-05-14',
      endDate: null,
      comment: null,
      isActive: true
    };

    // Act
    const result = pilloScheduleRuleSchema.parse(input);

    // Assert
    expect(result.doseUnits).toBe(0.5);
  });
});
