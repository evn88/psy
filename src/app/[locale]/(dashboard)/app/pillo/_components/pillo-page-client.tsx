'use client';

import { useOptimistic } from 'react';

import { usePilloViewModel } from '../_hooks/use-pillo-view-model';
import { PilloAppShell } from './pillo-app-shell';
import type { PilloPagePayload } from './types';
import { PilloOptimisticContext, type PilloOptimisticAction } from '../_hooks/use-pillo-optimistic';

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
            scheduleRules: state.scheduleRules.filter(r => r.id !== action.id)
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

  const { historyEntries, medications, scheduleRules, todayIntakes, weeklyScheduledIntakes } =
    usePilloViewModel(payload);

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
        viewer={payload.viewer}
        weeklyScheduledIntakes={weeklyScheduledIntakes}
      />
    </PilloOptimisticContext.Provider>
  );
};
