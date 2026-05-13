import { z } from 'zod';

import { PILLO_WEEK_DAYS } from './constants';
import { parsePilloAmount } from './stock-calculation';

const optionalText = z
  .string()
  .trim()
  .transform(value => (value.length > 0 ? value : null))
  .nullable()
  .optional();

const toPilloAmount = (value: unknown) => {
  const parsed = parsePilloAmount(value);

  return parsed ?? Number.NaN;
};

const positiveAmount = (max: number) =>
  z.preprocess(toPilloAmount, z.number().finite().positive().max(max));

const nonNegativeAmount = (max: number) =>
  z.preprocess(toPilloAmount, z.number().finite().min(0).max(max));

export const pilloMedicationSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  photoUrl: z.string().url().nullable().optional(),
  description: optionalText,
  dosageValue: positiveAmount(100_000),
  dosageUnit: z.string().trim().min(1).max(20),
  form: z.string().trim().min(1).max(80),
  packagesCount: z.coerce.number().int().min(0).max(10_000),
  unitsPerPackage: z.coerce.number().int().min(1).max(100_000).nullable().optional(),
  stockUnits: nonNegativeAmount(1_000_000).nullable().optional(),
  minThresholdUnits: nonNegativeAmount(1_000_000),
  isActive: z.coerce.boolean()
});

export const pilloScheduleRuleSchema = z.object({
  id: z.string().optional(),
  medicationId: z.string().min(1),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  doseUnits: positiveAmount(10_000),
  daysOfWeek: z
    .array(z.coerce.number().int())
    .nonempty()
    .transform(days => {
      return [...new Set(days.filter(day => PILLO_WEEK_DAYS.includes(day as never)))];
    }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  comment: optionalText,
  isActive: z.coerce.boolean()
});

export const pilloSettingsSchema = z.object({
  emailRemindersEnabled: z.coerce.boolean(),
  pushRemindersEnabled: z.coerce.boolean(),
  lowStockEmailEnabled: z.coerce.boolean(),
  lowStockPushEnabled: z.coerce.boolean(),
  lowStockWarningDays: z.coerce.number().int().min(0)
});

export const pilloManualIntakeSchema = z.object({
  medicationId: z.string().min(1),
  doseUnits: positiveAmount(10_000),
  takenDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

/**
 * Преобразует строку даты формы в Date на полдень UTC.
 * @param value - дата в формате `yyyy-MM-dd`.
 * @returns Date для хранения границы правила.
 */
export const parsePilloDateInput = (value: string): Date => {
  return new Date(`${value}T12:00:00.000Z`);
};

export type PilloMedicationInput = z.infer<typeof pilloMedicationSchema>;
export type PilloScheduleRuleInput = z.infer<typeof pilloScheduleRuleSchema>;
export type PilloSettingsInput = z.infer<typeof pilloSettingsSchema>;
export type PilloManualIntakeInput = z.infer<typeof pilloManualIntakeSchema>;
