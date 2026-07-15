import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
  subYears
} from 'date-fns';
import { z } from 'zod';

export type DashboardPeriodPreset =
  | 'today'
  | 'week'
  | 'previousWeek'
  | 'month'
  | 'previousMonth'
  | 'last30Days'
  | 'threeMonths'
  | 'sixMonths'
  | 'year'
  | 'custom';

export interface DashboardPeriod {
  from: string;
  to: string;
}

const dashboardPeriodSchema = z
  .object({
    from: z.iso.datetime(),
    to: z.iso.datetime()
  })
  .refine(period => new Date(period.from) <= new Date(period.to), {
    message: 'Period start must not be after period end'
  })
  .refine(
    period =>
      new Date(period.to).getTime() - new Date(period.from).getTime() <=
      5 * 366 * 24 * 60 * 60 * 1000,
    { message: 'Dashboard period must not exceed five years' }
  );

/** Возвращает диапазон для предустановленного периода дашборда. */
export const getDashboardPeriod = (
  preset: Exclude<DashboardPeriodPreset, 'custom'>,
  now = new Date()
): DashboardPeriod => {
  const ranges = {
    today: { from: startOfDay(now), to: endOfDay(now) },
    week: {
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfWeek(now, { weekStartsOn: 1 })
    },
    previousWeek: {
      from: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
      to: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    },
    month: { from: startOfMonth(now), to: endOfMonth(now) },
    previousMonth: {
      from: startOfMonth(subMonths(now, 1)),
      to: endOfMonth(subMonths(now, 1))
    },
    last30Days: { from: startOfDay(subDays(now, 29)), to: endOfDay(now) },
    threeMonths: { from: startOfDay(subMonths(now, 3)), to: endOfDay(now) },
    sixMonths: { from: startOfDay(subMonths(now, 6)), to: endOfDay(now) },
    year: { from: startOfDay(subYears(now, 1)), to: endOfDay(now) }
  } as const;

  return {
    from: ranges[preset].from.toISOString(),
    to: ranges[preset].to.toISOString()
  };
};

/** Проверяет сериализованный период и возвращает даты для запросов Prisma. */
export const parseDashboardPeriod = (value: unknown): { from: Date; to: Date } => {
  const result = dashboardPeriodSchema.safeParse(value);

  if (!result.success) {
    throw new Error('Invalid dashboard period');
  }

  return { from: new Date(result.data.from), to: new Date(result.data.to) };
};

/** Создаёт диапазон из календарных дат в локальном часовом поясе браузера. */
export const getCustomDashboardPeriod = (from: Date, to: Date): DashboardPeriod => ({
  from: startOfDay(from).toISOString(),
  to: endOfDay(to).toISOString()
});
