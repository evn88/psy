'use client';

import { createContext, useContext } from 'react';
import type {
  PilloMedicationRecord,
  PilloScheduleRuleView,
  PilloHistoryEntryView
} from '../_components/types';

export type PilloOptimisticAction =
  | { type: 'take_intake'; id: string }
  | { type: 'skip_intake'; id: string }
  | { type: 'undo_intake'; id: string }
  | { type: 'add_medication'; medication: PilloMedicationRecord }
  | { type: 'update_medication'; medication: PilloMedicationRecord }
  | { type: 'delete_medication'; id: string }
  | { type: 'add_schedule'; schedule: PilloScheduleRuleView }
  | { type: 'update_schedule'; schedule: PilloScheduleRuleView }
  | { type: 'delete_schedule'; id: string }
  | { type: 'take_manual_intake'; entry: PilloHistoryEntryView };

export const PilloOptimisticContext = createContext<(action: PilloOptimisticAction) => void>(
  () => {}
);

export const usePilloOptimistic = () => {
  return useContext(PilloOptimisticContext);
};
