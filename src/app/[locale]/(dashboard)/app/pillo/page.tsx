import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

import { requirePilloUser } from '@/modules/pillo/access';
import { ensurePilloUserSettings, materializePilloIntakesForUser } from '@/modules/pillo/service';
import { getPilloLocalDateKey } from '@/modules/pillo/schedule';
import { toNumber } from '@/modules/pillo/stock';
import prisma from '@/lib/prisma';
import { PilloPageClient } from './_components/pillo-page-client';
import type {
  PilloAppearanceSettingsView,
  PilloHistoryEntryView,
  PilloIntakeRecord,
  PilloMedicationRecord,
  PilloPagePayload,
  PilloScheduleRuleView,
  PilloWeeklyScheduledIntakeView
} from './_components/types';

type DbPilloMedication = Prisma.PilloMedicationGetPayload<Record<string, never>>;
type DbPilloScheduleRule = Prisma.PilloScheduleRuleGetPayload<{
  include: { medication: { select: { name: true; photoUrl: true } } };
}>;
type DbPilloIntake = Prisma.PilloIntakeGetPayload<{
  include: {
    medication: true;
    scheduleRule: { select: { comment: true } };
  };
}>;
type DbTakenHistoryIntake = Prisma.PilloIntakeGetPayload<{
  include: {
    medication: true;
  };
}>;
type DbPilloManualIntake = Prisma.PilloManualIntakeGetPayload<{
  include: {
    medication: true;
  };
}>;

/**
 * Возвращает delegate ручных приёмов, если текущий runtime уже знает о новой Prisma-модели.
 * @returns Delegate `findMany` либо `null`.
 */
const getPilloManualIntakeDelegate = (): {
  findMany: (args: Record<string, unknown>) => Promise<DbPilloManualIntake[]>;
} | null => {
  const delegate = (prisma as { pilloManualIntake?: unknown }).pilloManualIntake;

  if (!delegate || typeof delegate !== 'object') {
    return null;
  }

  if (typeof (delegate as { findMany?: unknown }).findMany !== 'function') {
    return null;
  }

  return delegate as {
    findMany: (args: Record<string, unknown>) => Promise<DbPilloManualIntake[]>;
  };
};

export const metadata: Metadata = {
  title: 'Pillo',
  robots: {
    index: false,
    follow: false
  },
  appleWebApp: {
    capable: true,
    title: 'Pillo',
    statusBarStyle: 'default'
  }
};

/**
 * Преобразует дату правила к значению input[type=date].
 * @param date - дата из БД.
 * @returns Строка `yyyy-MM-dd`.
 */
const toDateInputValue = (date: Date | null): string | null => {
  return date ? date.toISOString().slice(0, 10) : null;
};

/**
 * Страница мини-приложения Pillo.
 * @returns Защищённый PWA-интерфейс таблеток и расписания.
 */
const PilloPage = async () => {
  const user = await requirePilloUser();
  await ensurePilloUserSettings(user.id);
  await materializePilloIntakesForUser(user.id);

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      pilloUserSettings: true,
      pilloMedications: {
        orderBy: [{ name: 'asc' }]
      },
      pilloScheduleRules: {
        include: {
          medication: {
            select: { name: true, photoUrl: true }
          }
        },
        orderBy: [{ isActive: 'desc' }, { time: 'asc' }]
      }
    }
  });

  if (!dbUser) {
    return null;
  }

  const settings = dbUser.pilloUserSettings ?? {
    emailRemindersEnabled: true,
    pushRemindersEnabled: true,
    lowStockEmailEnabled: true,
    lowStockPushEnabled: true,
    lowStockWarningDays: 7
  };
  const timezone = dbUser.timezone || 'UTC';
  const todayKey = getPilloLocalDateKey(new Date(), timezone);
  const weekStartKey = formatInTimeZone(subDays(new Date(), 6), timezone, 'yyyy-MM-dd');
  const manualIntakeDelegate = getPilloManualIntakeDelegate();
  const [todayIntakes, takenHistoryIntakes, manualHistoryIntakes, weeklyScheduledIntakes] =
    await Promise.all([
      prisma.pilloIntake.findMany({
        where: {
          userId: user.id,
          localDate: todayKey
        },
        include: {
          medication: true,
          scheduleRule: {
            select: { comment: true }
          }
        },
        orderBy: [{ scheduledFor: 'asc' }]
      }),
      prisma.pilloIntake.findMany({
        where: {
          userId: user.id,
          status: 'TAKEN',
          takenAt: { not: null }
        },
        include: {
          medication: true
        },
        orderBy: [{ takenAt: 'desc' }],
        take: 120
      }),
      manualIntakeDelegate
        ? manualIntakeDelegate.findMany({
            where: {
              userId: user.id
            },
            include: {
              medication: true
            },
            orderBy: [{ takenAt: 'desc' }],
            take: 120
          })
        : Promise.resolve([]),
      prisma.pilloIntake.findMany({
        where: {
          userId: user.id,
          localDate: {
            gte: weekStartKey,
            lte: todayKey
          }
        },
        include: {
          medication: true
        },
        orderBy: [{ scheduledFor: 'asc' }]
      })
    ]);

  const scheduleRules: PilloScheduleRuleView[] = (
    dbUser.pilloScheduleRules as DbPilloScheduleRule[]
  ).map(rule => ({
    id: rule.id,
    medicationId: rule.medicationId,
    medicationName: rule.medication.name,
    medicationPhotoUrl: rule.medication.photoUrl,
    time: rule.time,
    doseUnits: toNumber(rule.doseUnits),
    daysOfWeek: rule.daysOfWeek,
    startDate: toDateInputValue(rule.startDate) ?? '',
    endDate: toDateInputValue(rule.endDate),
    comment: rule.comment,
    isActive: rule.isActive
  }));

  const medications: PilloMedicationRecord[] = (dbUser.pilloMedications as DbPilloMedication[]).map(
    medication => ({
      id: medication.id,
      name: medication.name,
      photoUrl: medication.photoUrl,
      description: medication.description,
      dosage: medication.dosage,
      dosageValue: medication.dosageValue ? toNumber(medication.dosageValue) : null,
      dosageUnit: medication.dosageUnit,
      form: medication.form,
      packagesCount: medication.packagesCount,
      unitsPerPackage: medication.unitsPerPackage,
      stockUnits: toNumber(medication.stockUnits),
      minThresholdUnits: toNumber(medication.minThresholdUnits),
      isActive: medication.isActive
    })
  );

  const intakeRecords: PilloIntakeRecord[] = (todayIntakes as DbPilloIntake[]).map(intake => ({
    id: intake.id,
    medicationId: intake.medicationId,
    medicationName: intake.medication.name,
    medicationDosage: intake.medication.dosage ?? '',
    medicationPhotoUrl: intake.medication.photoUrl,
    scheduledFor: intake.scheduledFor.toISOString(),
    localDate: intake.localDate,
    localTime: intake.localTime,
    doseUnits: toNumber(intake.doseUnits),
    status: intake.status,
    comment: intake.scheduleRule.comment,
    medicationStockUnits: toNumber(intake.medication.stockUnits),
    medicationMinThresholdUnits: toNumber(intake.medication.minThresholdUnits)
  }));

  const historyEntries: PilloHistoryEntryView[] = [
    ...(takenHistoryIntakes as DbTakenHistoryIntake[]).flatMap(intake => {
      if (!intake.takenAt) {
        return [];
      }

      return [
        {
          id: intake.id,
          medicationId: intake.medicationId,
          medicationName: intake.medication.name,
          medicationDosage: intake.medication.dosage ?? '',
          medicationPhotoUrl: intake.medication.photoUrl,
          doseUnits: toNumber(intake.doseUnits),
          takenAt: intake.takenAt.toISOString(),
          localDate: intake.localDate,
          localTime: intake.localTime,
          source: 'scheduled' as const
        }
      ];
    }),
    ...(manualHistoryIntakes as DbPilloManualIntake[]).map(intake => ({
      id: intake.id,
      medicationId: intake.medicationId,
      medicationName: intake.medication.name,
      medicationDosage: intake.medication.dosage ?? '',
      medicationPhotoUrl: intake.medication.photoUrl,
      doseUnits: toNumber(intake.doseUnits),
      takenAt: intake.takenAt.toISOString(),
      localDate: intake.localDate,
      localTime: intake.localTime,
      source: 'manual' as const
    }))
  ].sort((left, right) => {
    return new Date(right.takenAt).getTime() - new Date(left.takenAt).getTime();
  });

  const weeklyIntakeRecords: PilloWeeklyScheduledIntakeView[] = (
    weeklyScheduledIntakes as DbPilloIntake[]
  ).map(intake => ({
    id: intake.id,
    medicationId: intake.medicationId,
    medicationName: intake.medication.name,
    medicationDosage: intake.medication.dosage ?? '',
    medicationPhotoUrl: intake.medication.photoUrl,
    scheduledFor: intake.scheduledFor.toISOString(),
    localDate: intake.localDate,
    localTime: intake.localTime,
    doseUnits: toNumber(intake.doseUnits),
    status: intake.status
  }));

  const appearanceSettings: PilloAppearanceSettingsView = {
    language: dbUser.language,
    theme: dbUser.theme
  };

  const payload: PilloPagePayload = {
    appearanceSettings,
    currentLocalDate: todayKey,
    historyEntries,
    medications,
    referenceDateIso: new Date().toISOString(),
    scheduleRules,
    settings: {
      emailRemindersEnabled: settings.emailRemindersEnabled,
      pushRemindersEnabled: settings.pushRemindersEnabled,
      lowStockEmailEnabled: settings.lowStockEmailEnabled,
      lowStockPushEnabled: settings.lowStockPushEnabled,
      lowStockWarningDays: settings.lowStockWarningDays
    },
    todayIntakes: intakeRecords,
    weeklyScheduledIntakes: weeklyIntakeRecords
  };

  return <PilloPageClient payload={payload} />;
};

export default PilloPage;
