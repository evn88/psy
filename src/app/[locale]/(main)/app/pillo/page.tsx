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
  include: { medication: { select: { name: true; photoUrl: true } } };
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

  const medications: PilloMedicationView[] = (dbUser.pilloMedications as DbPilloMedication[]).map(
    medication => {
      const activeRules = scheduleRules.filter(
        rule => rule.medicationId === medication.id && rule.isActive
      );

      let daysLeft: number | null = null;
      let buyAtDate: string | null = null;
      if (activeRules.length > 0) {
        let weeklyConsumption = 0;
        for (const rule of activeRules) {
          weeklyConsumption += rule.doseUnits * rule.daysOfWeek.length;
        }

        if (weeklyConsumption > 0) {
          const dailyConsumption = weeklyConsumption / 7;
          const stock = toNumber(medication.stockUnits);
          const minStock = toNumber(medication.minThresholdUnits);

          daysLeft = Math.floor(stock / dailyConsumption);

          const daysUntilMinStock = (stock - minStock) / dailyConsumption;
          const daysToBuy = Math.floor(daysUntilMinStock - 7);

          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + daysToBuy);
          buyAtDate = targetDate.toISOString();
        }
      }

      return {
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
        isActive: medication.isActive,
        stockStatus: getPilloStockStatus({
          stockUnits: medication.stockUnits,
          minThresholdUnits: medication.minThresholdUnits
        }),
        daysLeft,
        buyAtDate
      };
    }
  );

  const intakes: PilloIntakeView[] = (todayIntakes as DbPilloIntake[]).map(intake => {
    const med = medications.find(m => m.id === intake.medicationId);
    return {
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
      stockUnits: toNumber(intake.medication.stockUnits),
      minThresholdUnits: toNumber(intake.medication.minThresholdUnits),
      stockStatus: getPilloStockStatus({
        stockUnits: intake.medication.stockUnits,
        minThresholdUnits: intake.medication.minThresholdUnits,
        nextDoseUnits: intake.doseUnits
      }),
      daysLeft: med?.daysLeft ?? null,
      buyAtDate: med?.buyAtDate ?? null
    };
  });

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
