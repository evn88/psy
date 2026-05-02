import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';

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
  PilloHistoryEntryView,
  PilloIntakeView,
  PilloMedicationView,
  PilloMonthlyMedicationStatView,
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
  const currentMonthPrefix = formatInTimeZone(new Date(), timezone, 'yyyy-MM');
  const manualIntakeDelegate = getPilloManualIntakeDelegate();
  const [
    todayIntakes,
    takenHistoryIntakes,
    manualHistoryIntakes,
    monthlyTakenIntakes,
    monthlyManualIntakes
  ] = await Promise.all([
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
        status: 'TAKEN',
        localDate: {
          startsWith: currentMonthPrefix
        },
        takenAt: { not: null }
      },
      include: {
        medication: true
      }
    }),
    manualIntakeDelegate
      ? manualIntakeDelegate.findMany({
          where: {
            userId: user.id,
            localDate: {
              startsWith: currentMonthPrefix
            }
          },
          include: {
            medication: true
          }
        })
      : Promise.resolve([])
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

  const medications: PilloMedicationView[] = (dbUser.pilloMedications as DbPilloMedication[]).map(
    medication => {
      const activeRules = scheduleRules.filter(
        rule => rule.medicationId === medication.id && rule.isActive
      );

      let daysLeft: number | null = null;
      let buyAtDate: string | null = null;
      let stockEndsAt: string | null = null;
      if (activeRules.length > 0) {
        // Считаем суммарное недельное потребление: сколько единиц расходуется за неделю
        let weeklyConsumption = 0;
        for (const rule of activeRules) {
          weeklyConsumption += rule.doseUnits * rule.daysOfWeek.length;
        }

        if (weeklyConsumption > 0) {
          const dailyConsumption = weeklyConsumption / 7;
          const stock = toNumber(medication.stockUnits);

          // На сколько дней хватит текущего остатка
          daysLeft = Math.floor(stock / dailyConsumption);

          // Точная дата окончания запасов
          const endsDate = new Date();
          endsDate.setDate(endsDate.getDate() + daysLeft);
          stockEndsAt = endsDate.toISOString();

          // Рекомендация купить — за пользовательское количество дней до окончания.
          const daysToBuy = Math.max(0, daysLeft - settings.lowStockWarningDays);

          // Если осталось ≤1 дня до рекомендации — показываем только дату окончания
          if (daysToBuy > 1) {
            const buyDate = new Date();
            buyDate.setDate(buyDate.getDate() + daysToBuy);
            buyAtDate = buyDate.toISOString();
          }
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
        buyAtDate,
        stockEndsAt
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
      buyAtDate: med?.buyAtDate ?? null,
      stockEndsAt: med?.stockEndsAt ?? null
    };
  });

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

  const monthlyStatsMap = new Map<string, PilloMonthlyMedicationStatView>();
  const monthHistoryEntries: PilloHistoryEntryView[] = [
    ...(monthlyTakenIntakes as DbTakenHistoryIntake[]).flatMap(intake => {
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
    ...(monthlyManualIntakes as DbPilloManualIntake[]).map(intake => ({
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
  ];

  for (const entry of monthHistoryEntries) {
    const current = monthlyStatsMap.get(entry.medicationId);

    if (current) {
      current.totalUnits += entry.doseUnits;
      current.intakesCount += 1;
      continue;
    }

    monthlyStatsMap.set(entry.medicationId, {
      medicationId: entry.medicationId,
      medicationName: entry.medicationName,
      medicationPhotoUrl: entry.medicationPhotoUrl,
      totalUnits: entry.doseUnits,
      intakesCount: 1
    });
  }

  const monthlyIntakeStats = [...monthlyStatsMap.values()].sort((left, right) => {
    return right.totalUnits - left.totalUnits;
  });

  const appearanceSettings: PilloAppearanceSettingsView = {
    language: dbUser.language,
    theme: dbUser.theme
  };

  return (
    <PilloAppShell
      appearanceSettings={appearanceSettings}
      historyEntries={historyEntries}
      intakes={intakes}
      medications={medications}
      monthlyIntakeStats={monthlyIntakeStats}
      scheduleRules={scheduleRules}
      settings={{
        emailRemindersEnabled: settings.emailRemindersEnabled,
        pushRemindersEnabled: settings.pushRemindersEnabled,
        lowStockEmailEnabled: settings.lowStockEmailEnabled,
        lowStockPushEnabled: settings.lowStockPushEnabled,
        lowStockWarningDays: settings.lowStockWarningDays
      }}
    />
  );
};

export default PilloPage;
