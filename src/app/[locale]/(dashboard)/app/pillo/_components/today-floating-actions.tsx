import { Check, History } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { ManualIntakeDialog } from './manual-intake-dialog';
import { PilloHistorySheet } from './pillo-history-sheet';
import type {
  PilloHistoryEntryView,
  PilloMedicationView,
  PilloWeeklyScheduledIntakeView
} from './types';

export const TodayFloatingActions = ({
  currentLocalDate,
  hasMedications,
  historyEntries,
  medications,
  weeklyScheduledIntakes
}: {
  currentLocalDate: string;
  hasMedications: boolean;
  historyEntries: PilloHistoryEntryView[];
  medications: PilloMedicationView[];
  weeklyScheduledIntakes: PilloWeeklyScheduledIntakeView[];
}) => {
  const t = useTranslations('Pillo');
  const actionButtonClassName =
    'pointer-events-auto h-14 flex-1 rounded-full shadow-xl shadow-primary/20 text-base font-bold';

  return (
    <div className="fixed bottom-[5.5rem] left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 gap-3 px-4 pointer-events-none">
      {hasMedications ? (
        <ManualIntakeDialog medications={medications}>
          <Button className={actionButtonClassName}>
            <Check className="mr-2 h-5 w-5 stroke-[3px]" />
            {t('today.manualTakeAction')}
          </Button>
        </ManualIntakeDialog>
      ) : (
        <Button disabled className={actionButtonClassName}>
          <Check className="mr-2 h-5 w-5 stroke-[3px]" />
          {t('today.manualTakeAction')}
        </Button>
      )}

      <PilloHistorySheet
        currentLocalDate={currentLocalDate}
        historyEntries={historyEntries}
        weeklyScheduledIntakes={weeklyScheduledIntakes}
      >
        <Button
          variant="outline"
          size="icon"
          className="pointer-events-auto h-14 w-14 shrink-0 rounded-full border-white/40 bg-white/60 backdrop-blur-md shadow-xl dark:border-white/10 dark:bg-white/5"
        >
          <History className="h-5 w-5" />
        </Button>
      </PilloHistorySheet>
    </div>
  );
};
