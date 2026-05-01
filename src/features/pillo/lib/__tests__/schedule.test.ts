import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generatePilloIntakesForRule } from '../schedule';

describe('Pillo schedule helpers', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('создаёт приёмы только в пределах rolling window 48 часов', () => {
    // Arrange
    const windowStart = new Date('2026-05-02T08:00:00.000Z');

    // Act
    const intakes = generatePilloIntakesForRule({
      timezone: 'Europe/Belgrade',
      windowStart,
      rule: {
        id: 'rule-1',
        userId: 'user-1',
        medicationId: 'med-1',
        time: '09:00',
        doseUnits: 1,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        startDate: new Date('2026-05-01T12:00:00.000Z'),
        endDate: null,
        isActive: true,
        reminderWorkflowVersion: 3
      }
    });

    // Assert
    expect(intakes).toHaveLength(2);
    expect(intakes.map(item => item.localDate)).toEqual(['2026-05-03', '2026-05-04']);
    expect(intakes.every(item => item.reminderWorkflowVersion === 3)).toBe(true);
  });

  it('не создаёт приёмы для неактивного правила', () => {
    // Arrange
    const windowStart = new Date('2026-05-02T08:00:00.000Z');

    // Act
    const intakes = generatePilloIntakesForRule({
      timezone: 'Europe/Belgrade',
      windowStart,
      rule: {
        id: 'rule-1',
        userId: 'user-1',
        medicationId: 'med-1',
        time: '09:00',
        doseUnits: 1,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        startDate: new Date('2026-05-01T12:00:00.000Z'),
        endDate: null,
        isActive: false,
        reminderWorkflowVersion: 1
      }
    });

    // Assert
    expect(intakes).toEqual([]);
  });

  it('учитывает дни недели и дату окончания правила', () => {
    // Arrange
    const windowStart = new Date('2026-05-04T00:00:00.000Z');

    // Act
    const intakes = generatePilloIntakesForRule({
      timezone: 'Europe/Belgrade',
      windowStart,
      rule: {
        id: 'rule-1',
        userId: 'user-1',
        medicationId: 'med-1',
        time: '10:30',
        doseUnits: 2,
        daysOfWeek: [1],
        startDate: new Date('2026-05-01T12:00:00.000Z'),
        endDate: new Date('2026-05-04T12:00:00.000Z'),
        isActive: true,
        reminderWorkflowVersion: 1
      }
    });

    // Assert
    expect(intakes).toHaveLength(1);
    expect(intakes[0]?.localDate).toBe('2026-05-04');
    expect(intakes[0]?.localTime).toBe('10:30');
  });
});
