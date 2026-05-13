'use client';

import { useMemo } from 'react';

import { calculatePilloStockOutlook, getPilloStockStatus } from '@/modules/pillo/stock';

import type {
  PilloHistoryEntryView,
  PilloIntakeView,
  PilloMedicationView,
  PilloPagePayload,
  PilloScheduleRuleView,
  PilloWeeklyScheduledIntakeView
} from '../_components/types';

const getIntakeStatusPriority = (status: PilloIntakeView['status']): number => {
  if (status === 'PENDING') {
    return 0;
  }

  if (status === 'TAKEN') {
    return 1;
  }

  return 2;
};

const sortScheduleRules = (scheduleRules: PilloScheduleRuleView[]): PilloScheduleRuleView[] => {
  return [...scheduleRules].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    return left.time.localeCompare(right.time);
  });
};

export const usePilloViewModel = (payload: PilloPagePayload) => {
  const medications = useMemo<PilloMedicationView[]>(() => {
    const referenceDate = new Date(payload.referenceDateIso);
    const activeRulesByMedicationId = new Map<string, PilloScheduleRuleView[]>();

    for (const rule of payload.scheduleRules) {
      if (!rule.isActive) {
        continue;
      }

      const existingRules = activeRulesByMedicationId.get(rule.medicationId);

      if (existingRules) {
        existingRules.push(rule);
        continue;
      }

      activeRulesByMedicationId.set(rule.medicationId, [rule]);
    }

    return payload.medications
      .map(medication => {
        const activeRules = activeRulesByMedicationId.get(medication.id) ?? [];
        const stockOutlook = calculatePilloStockOutlook({
          stockUnits: medication.stockUnits,
          rules: activeRules,
          referenceDate,
          lowStockWarningDays: payload.settings.lowStockWarningDays
        });

        return {
          ...medication,
          stockStatus: getPilloStockStatus({
            stockUnits: medication.stockUnits,
            minThresholdUnits: medication.minThresholdUnits
          }),
          daysLeft: stockOutlook.daysLeft,
          buyAtDate: stockOutlook.buyAtDate,
          stockEndsAt: stockOutlook.stockEndsAt
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [
    payload.medications,
    payload.referenceDateIso,
    payload.scheduleRules,
    payload.settings.lowStockWarningDays
  ]);

  const todayIntakes = useMemo<PilloIntakeView[]>(() => {
    const medicationById = new Map(medications.map(medication => [medication.id, medication]));

    return payload.todayIntakes
      .map(intake => {
        const medication = medicationById.get(intake.medicationId);

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
      })
      .sort((left, right) => {
        const statusDiff =
          getIntakeStatusPriority(left.status) - getIntakeStatusPriority(right.status);

        if (statusDiff !== 0) {
          return statusDiff;
        }

        return new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime();
      });
  }, [medications, payload.todayIntakes]);

  const historyEntries = useMemo<PilloHistoryEntryView[]>(() => {
    return [...payload.historyEntries].sort((left, right) => {
      return new Date(right.takenAt).getTime() - new Date(left.takenAt).getTime();
    });
  }, [payload.historyEntries]);

  const weeklyScheduledIntakes = useMemo<PilloWeeklyScheduledIntakeView[]>(() => {
    return [...payload.weeklyScheduledIntakes].sort((left, right) => {
      return new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime();
    });
  }, [payload.weeklyScheduledIntakes]);

  const scheduleRules = useMemo(() => {
    return sortScheduleRules(payload.scheduleRules);
  }, [payload.scheduleRules]);

  return {
    historyEntries,
    medications,
    scheduleRules,
    todayIntakes,
    weeklyScheduledIntakes
  };
};
