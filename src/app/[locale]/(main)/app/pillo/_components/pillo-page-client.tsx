'use client';

import { useMemo } from 'react';

import { getPilloStockStatus } from '@/features/pillo/lib/stock';
import { PilloAppShell } from './pillo-app-shell';
import type {
  PilloHistoryEntryView,
  PilloIntakeView,
  PilloMedicationView,
  PilloMonthlyMedicationStatView,
  PilloPagePayload
} from './types';

/**
 * Клиентский composer Pillo, который собирает view-model из серверного payload.
 * @param props - сериализуемые данные маршрута.
 * @returns Полностью клиентский shell приложения.
 */
export const PilloPageClient = ({ payload }: { payload: PilloPagePayload }) => {
  const medications = useMemo<PilloMedicationView[]>(() => {
    const referenceDate = new Date(payload.referenceDateIso);

    return payload.medications.map(medication => {
      const activeRules = payload.scheduleRules.filter(
        rule => rule.medicationId === medication.id && rule.isActive
      );

      let daysLeft: number | null = null;
      let buyAtDate: string | null = null;
      let stockEndsAt: string | null = null;

      if (activeRules.length > 0) {
        let weeklyConsumption = 0;

        for (const rule of activeRules) {
          weeklyConsumption += rule.doseUnits * rule.daysOfWeek.length;
        }

        if (weeklyConsumption > 0) {
          const dailyConsumption = weeklyConsumption / 7;
          daysLeft = Math.floor(medication.stockUnits / dailyConsumption);

          const endsDate = new Date(referenceDate);
          endsDate.setDate(endsDate.getDate() + daysLeft);
          stockEndsAt = endsDate.toISOString();

          const daysToBuy = Math.max(0, daysLeft - payload.settings.lowStockWarningDays);

          if (daysToBuy > 1) {
            const buyDate = new Date(referenceDate);
            buyDate.setDate(buyDate.getDate() + daysToBuy);
            buyAtDate = buyDate.toISOString();
          }
        }
      }

      return {
        ...medication,
        stockStatus: getPilloStockStatus({
          stockUnits: medication.stockUnits,
          minThresholdUnits: medication.minThresholdUnits
        }),
        daysLeft,
        buyAtDate,
        stockEndsAt
      };
    });
  }, [
    payload.medications,
    payload.referenceDateIso,
    payload.scheduleRules,
    payload.settings.lowStockWarningDays
  ]);

  const todayIntakes = useMemo<PilloIntakeView[]>(() => {
    return payload.todayIntakes.map(intake => {
      const medication = medications.find(item => item.id === intake.medicationId);

      return {
        id: intake.id,
        medicationId: intake.medicationId,
        medicationName: intake.medicationName,
        medicationDosage: intake.medicationDosage,
        medicationPhotoUrl: intake.medicationPhotoUrl,
        scheduledFor: intake.scheduledFor,
        localDate: intake.localDate,
        localTime: intake.localTime,
        doseUnits: intake.doseUnits,
        status: intake.status,
        comment: intake.comment,
        stockUnits: intake.medicationStockUnits,
        minThresholdUnits: intake.medicationMinThresholdUnits,
        stockStatus: getPilloStockStatus({
          stockUnits: intake.medicationStockUnits,
          minThresholdUnits: intake.medicationMinThresholdUnits,
          nextDoseUnits: intake.doseUnits
        }),
        daysLeft: medication?.daysLeft ?? null,
        buyAtDate: medication?.buyAtDate ?? null,
        stockEndsAt: medication?.stockEndsAt ?? null
      };
    });
  }, [medications, payload.todayIntakes]);

  const monthlyIntakeStats = useMemo<PilloMonthlyMedicationStatView[]>(() => {
    const monthlyStatsMap = new Map<string, PilloMonthlyMedicationStatView>();

    for (const entry of payload.monthlyHistoryEntries) {
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

    return [...monthlyStatsMap.values()].sort((left, right) => right.totalUnits - left.totalUnits);
  }, [payload.monthlyHistoryEntries]);

  const historyEntries = useMemo<PilloHistoryEntryView[]>(() => {
    return [...payload.historyEntries].sort((left, right) => {
      return new Date(right.takenAt).getTime() - new Date(left.takenAt).getTime();
    });
  }, [payload.historyEntries]);

  return (
    <PilloAppShell
      appearanceSettings={payload.appearanceSettings}
      historyEntries={historyEntries}
      intakes={todayIntakes}
      medications={medications}
      monthlyIntakeStats={monthlyIntakeStats}
      scheduleRules={payload.scheduleRules}
      settings={payload.settings}
    />
  );
};
