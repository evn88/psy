import { describe, expect, it } from 'vitest';

import { buildWeeklyDaySummaries } from '../pillo-history-utils';

describe('Pillo history summary helpers', () => {
  it('учитывает ручные приёмы в недельной сводке', () => {
    // Arrange
    const historyEntries = [
      {
        id: 'manual-1',
        medicationId: 'med-1',
        medicationName: 'Vitamin D',
        medicationDosage: '1000 IU',
        medicationPhotoUrl: null,
        doseUnits: 0.5,
        takenAt: '2026-05-13T08:00:00.000Z',
        localDate: '2026-05-13',
        localTime: '10:00',
        source: 'manual' as const
      }
    ];

    // Act
    const result = buildWeeklyDaySummaries({
      currentLocalDate: '2026-05-14',
      historyEntries,
      weeklyScheduledIntakes: []
    });

    // Assert
    const day = result.find(item => item.dateKey === '2026-05-13');
    expect(day?.plannedCount).toBe(1);
    expect(day?.takenCount).toBe(1);
    expect(day?.takenMedications).toEqual([
      {
        count: 1,
        medicationId: 'med-1',
        medicationName: 'Vitamin D'
      }
    ]);
  });
});
