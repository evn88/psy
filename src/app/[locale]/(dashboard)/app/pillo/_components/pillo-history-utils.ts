import { eachDayOfInterval, format, subDays } from 'date-fns';

import type { PilloWeeklyScheduledIntakeView } from './types';

export type DailyMedicationSummary = {
  count: number;
  medicationId: string;
  medicationName: string;
};

export type WeeklyDaySummary = {
  adherencePercent: number;
  date: Date;
  dateKey: string;
  missedCount: number;
  missedMedications: DailyMedicationSummary[];
  pendingCount: number;
  pendingMedications: DailyMedicationSummary[];
  plannedCount: number;
  takenCount: number;
  takenMedications: DailyMedicationSummary[];
};

export const getWeeklyDayTone = (day: WeeklyDaySummary) => {
  if (day.missedCount > 0) {
    return {
      cardClassName: 'border-rose-500/20 bg-rose-500/[0.07]',
      progressClassName: 'text-rose-500',
      trackClassName: 'stroke-rose-500/15'
    };
  }

  if (day.pendingCount > 0) {
    return {
      cardClassName: 'border-amber-500/20 bg-amber-500/[0.07]',
      progressClassName: 'text-amber-500',
      trackClassName: 'stroke-amber-500/15'
    };
  }

  if (day.plannedCount > 0) {
    return {
      cardClassName: 'border-emerald-500/20 bg-emerald-500/[0.07]',
      progressClassName: 'text-emerald-500',
      trackClassName: 'stroke-emerald-500/15'
    };
  }

  return {
    cardClassName: 'border-white/10 bg-background/40',
    progressClassName: 'text-muted-foreground/50',
    trackClassName: 'stroke-white/10 dark:stroke-white/10'
  };
};

export const getLocalHistoryDate = (value: string) => {
  return new Date(`${value}T12:00:00`);
};

export const appendMedicationSummary = (
  items: DailyMedicationSummary[],
  entry: PilloWeeklyScheduledIntakeView
) => {
  const current = items.find(item => item.medicationId === entry.medicationId);

  if (current) {
    current.count += 1;
    return items;
  }

  return [
    ...items,
    {
      count: 1,
      medicationId: entry.medicationId,
      medicationName: entry.medicationName
    }
  ];
};

export const buildWeeklyDaySummaries = ({
  currentLocalDate,
  weeklyScheduledIntakes
}: {
  currentLocalDate: string;
  weeklyScheduledIntakes: PilloWeeklyScheduledIntakeView[];
}) => {
  const referenceDate = getLocalHistoryDate(currentLocalDate);
  const weekDays = eachDayOfInterval({
    start: subDays(referenceDate, 6),
    end: referenceDate
  });
  const weeklyEntriesByDate = new Map<string, PilloWeeklyScheduledIntakeView[]>();

  for (const entry of weeklyScheduledIntakes) {
    const existingEntries = weeklyEntriesByDate.get(entry.localDate);

    if (existingEntries) {
      existingEntries.push(entry);
      continue;
    }

    weeklyEntriesByDate.set(entry.localDate, [entry]);
  }

  return weekDays.map(day => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayEntries = weeklyEntriesByDate.get(dateKey) ?? [];
    let missedCount = 0;
    let pendingCount = 0;
    let takenCount = 0;
    let takenMedications: DailyMedicationSummary[] = [];
    let missedMedications: DailyMedicationSummary[] = [];
    let pendingMedications: DailyMedicationSummary[] = [];

    for (const entry of dayEntries) {
      if (entry.status === 'TAKEN') {
        takenCount += 1;
        takenMedications = appendMedicationSummary(takenMedications, entry);
        continue;
      }

      if (
        entry.status === 'SKIPPED' ||
        entry.status === 'MISSED' ||
        (entry.status === 'PENDING' && entry.localDate < currentLocalDate)
      ) {
        missedCount += 1;
        missedMedications = appendMedicationSummary(missedMedications, entry);
        continue;
      }

      pendingCount += 1;
      pendingMedications = appendMedicationSummary(pendingMedications, entry);
    }

    return {
      adherencePercent:
        dayEntries.length > 0 ? Math.round((takenCount / dayEntries.length) * 100) : 0,
      date: day,
      dateKey,
      missedCount,
      missedMedications,
      pendingCount,
      pendingMedications,
      plannedCount: dayEntries.length,
      takenCount,
      takenMedications
    } satisfies WeeklyDaySummary;
  });
};

export const formatMedicationSummary = (items: DailyMedicationSummary[]) => {
  return items
    .map(item => {
      return item.count > 1 ? `${item.medicationName} x${item.count}` : item.medicationName;
    })
    .join(', ');
};
