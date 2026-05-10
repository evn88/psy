'use client';

import { useMemo, useOptimistic } from 'react';

import { getPilloStockStatus } from '@/modules/pillo/stock';
import { PilloAppShell } from './pillo-app-shell';
import type {
  PilloHistoryEntryView,
  PilloIntakeView,
  PilloMedicationView,
  PilloPagePayload,
  PilloWeeklyScheduledIntakeView
} from './types';
import { PilloOptimisticContext, type PilloOptimisticAction } from '../_hooks/use-pillo-optimistic';

/**
 * Возвращает приоритет статуса для сортировки списка приёмов.
 * @param status - статус приёма.
 * @returns Меньшее значение поднимает элемент выше.
 */
const getIntakeStatusPriority = (status: PilloIntakeView['status']): number => {
  if (status === 'PENDING') {
    return 0;
  }

  if (status === 'TAKEN') {
    return 1;
  }

  return 2;
};

/**
 * Клиентский composer Pillo, который собирает view-model из серверного payload.
 * @param props - сериализуемые данные маршрута.
 * @returns Полностью клиентский shell приложения.
 */
export const PilloPageClient = ({ payload: initialPayload }: { payload: PilloPagePayload }) => {
  const [payload, addOptimisticAction] = useOptimistic<PilloPagePayload, PilloOptimisticAction>(
    initialPayload,
    (state, action) => {
      switch (action.type) {
        case 'take_intake':
          return {
            ...state,
            todayIntakes: state.todayIntakes.map(intake =>
              intake.id === action.id ? { ...intake, status: 'TAKEN' } : intake
            )
          };
        case 'skip_intake':
          return {
            ...state,
            todayIntakes: state.todayIntakes.map(intake =>
              intake.id === action.id ? { ...intake, status: 'SKIPPED' } : intake
            )
          };
        case 'undo_intake':
          return {
            ...state,
            todayIntakes: state.todayIntakes.map(intake =>
              intake.id === action.id ? { ...intake, status: 'PENDING' } : intake
            )
          };
        case 'add_medication':
          return {
            ...state,
            medications: [...state.medications, action.medication]
          };
        case 'update_medication':
          return {
            ...state,
            medications: state.medications.map(m =>
              m.id === action.medication.id ? action.medication : m
            )
          };
        case 'delete_medication':
          return {
            ...state,
            medications: state.medications.filter(m => m.id !== action.id),
            scheduleRules: state.scheduleRules.filter(r => r.medicationId !== action.id),
            todayIntakes: state.todayIntakes.filter(i => i.medicationId !== action.id)
          };
        case 'add_schedule':
          return {
            ...state,
            scheduleRules: [...state.scheduleRules, action.schedule]
          };
        case 'update_schedule':
          return {
            ...state,
            scheduleRules: state.scheduleRules.map(r =>
              r.id === action.schedule.id ? action.schedule : r
            )
          };
        case 'delete_schedule':
          return {
            ...state,
            scheduleRules: state.scheduleRules.filter(r => r.id !== action.id),
            todayIntakes: state.todayIntakes.filter(i => i.id !== action.id) // Rough approximation, rules map to multiple intakes, but this is optimistic
          };
        case 'take_manual_intake':
          return {
            ...state,
            historyEntries: [action.entry, ...state.historyEntries]
          };
        default:
          return state;
      }
    }
  );

  const medications = useMemo<PilloMedicationView[]>(() => {
    const referenceDate = new Date(payload.referenceDateIso);

    return payload.medications
      .map(medication => {
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
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [
    payload.medications,
    payload.referenceDateIso,
    payload.scheduleRules,
    payload.settings.lowStockWarningDays
  ]);

  const todayIntakes = useMemo<PilloIntakeView[]>(() => {
    return payload.todayIntakes
      .map(intake => {
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
    return [...payload.scheduleRules].sort((a, b) => {
      // isActive: desc
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      // time: asc
      return a.time.localeCompare(b.time);
    });
  }, [payload.scheduleRules]);

  return (
    <PilloOptimisticContext.Provider value={addOptimisticAction}>
      <PilloAppShell
        appearanceSettings={payload.appearanceSettings}
        currentLocalDate={payload.currentLocalDate}
        historyEntries={historyEntries}
        intakes={todayIntakes}
        medications={medications}
        scheduleRules={scheduleRules}
        settings={payload.settings}
        weeklyScheduledIntakes={weeklyScheduledIntakes}
      />
    </PilloOptimisticContext.Provider>
  );
};
