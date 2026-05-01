import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';

import { requirePilloUser } from '@/features/pillo/lib/access';
import {
  ensurePilloUserSettings,
  materializePilloIntakesForUser
} from '@/features/pillo/lib/service';
import { getPilloLocalDateKey } from '@/features/pillo/lib/schedule';
import { getPilloStockStatus, toNumber } from '@/features/pillo/lib/stock';
import prisma from '@/shared/lib/prisma';
import { PilloAppShell } from './_components/pillo-app-shell';
import type {
  PilloAppearanceSettingsView,
  PilloIntakeView,
  PilloMedicationView,
  PilloScheduleRuleView
} from './_components/types';

type DbPilloMedication = Prisma.PilloMedicationGetPayload<Record<string, never>>;
type DbPilloScheduleRule = Prisma.PilloScheduleRuleGetPayload<{
  include: { medication: { select: { name: true } } };
}>;
type DbPilloIntake = Prisma.PilloIntakeGetPayload<{
  include: {
    medication: true;
    scheduleRule: { select: { comment: true } };
  };
}>;

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
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
      },
      pilloScheduleRules: {
        where: { isActive: true },
        include: {
          medication: {
            select: { name: true }
          }
        },
        orderBy: [{ time: 'asc' }]
      }
    }
  });

  if (!dbUser) {
    return null;
  }

  const timezone = dbUser.timezone || 'UTC';
  const todayKey = getPilloLocalDateKey(new Date(), timezone);
  const todayIntakes = await prisma.pilloIntake.findMany({
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
  });

  const medications: PilloMedicationView[] = (dbUser.pilloMedications as DbPilloMedication[]).map(
    medication => ({
      id: medication.id,
      name: medication.name,
      photoUrl: medication.photoUrl,
      description: medication.description,
      dosage: medication.dosage,
      form: medication.form,
      packagesCount: medication.packagesCount,
      unitsPerPackage: medication.unitsPerPackage,
      stockUnits: toNumber(medication.stockUnits),
      minThresholdUnits: toNumber(medication.minThresholdUnits),
      isActive: medication.isActive,
      stockStatus: getPilloStockStatus({
        stockUnits: medication.stockUnits,
        minThresholdUnits: medication.minThresholdUnits
      })
    })
  );

  const scheduleRules: PilloScheduleRuleView[] = (
    dbUser.pilloScheduleRules as DbPilloScheduleRule[]
  ).map(rule => ({
    id: rule.id,
    medicationId: rule.medicationId,
    medicationName: rule.medication.name,
    time: rule.time,
    doseUnits: toNumber(rule.doseUnits),
    daysOfWeek: rule.daysOfWeek,
    startDate: toDateInputValue(rule.startDate) ?? '',
    endDate: toDateInputValue(rule.endDate),
    comment: rule.comment,
    isActive: rule.isActive
  }));

  const intakes: PilloIntakeView[] = (todayIntakes as DbPilloIntake[]).map(intake => ({
    id: intake.id,
    medicationId: intake.medicationId,
    medicationName: intake.medication.name,
    medicationDosage: intake.medication.dosage,
    scheduledFor: intake.scheduledFor.toISOString(),
    localDate: intake.localDate,
    localTime: intake.localTime,
    doseUnits: toNumber(intake.doseUnits),
    status: intake.status,
    comment: intake.scheduleRule.comment,
    stockUnits: toNumber(intake.medication.stockUnits),
    minThresholdUnits: toNumber(intake.medication.minThresholdUnits),
    stockStatus: getPilloStockStatus({
      stockUnits: intake.medication.stockUnits,
      minThresholdUnits: intake.medication.minThresholdUnits,
      nextDoseUnits: intake.doseUnits
    })
  }));

  const settings = dbUser.pilloUserSettings ?? {
    emailRemindersEnabled: true,
    pushRemindersEnabled: true,
    lowStockEmailEnabled: true,
    lowStockPushEnabled: true
  };
  const appearanceSettings: PilloAppearanceSettingsView = {
    language: dbUser.language,
    theme: dbUser.theme
  };

  return (
    <PilloAppShell
      appearanceSettings={appearanceSettings}
      intakes={intakes}
      medications={medications}
      scheduleRules={scheduleRules}
      settings={{
        emailRemindersEnabled: settings.emailRemindersEnabled,
        pushRemindersEnabled: settings.pushRemindersEnabled,
        lowStockEmailEnabled: settings.lowStockEmailEnabled,
        lowStockPushEnabled: settings.lowStockPushEnabled
      }}
    />
  );
};

export default PilloPage;
