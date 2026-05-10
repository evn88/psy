import { CalendarClock, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { EmptyState } from './empty-state';
import { ScheduleRuleCard } from './schedule-rule-card';
import { ScheduleRuleDialog } from './schedule-rule-dialog';
import type { PilloMedicationView, PilloScheduleRuleView } from './types';

/**
 * Рисует экран правил расписания.
 * @param props - таблетки и правила.
 * @returns Экран расписания.
 */
export const ScheduleView = ({
  medications,
  scheduleRules
}: {
  medications: PilloMedicationView[];
  scheduleRules: PilloScheduleRuleView[];
}) => {
  const t = useTranslations('Pillo');

  return (
    <div className="space-y-4">
      {scheduleRules.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={t('schedule.emptyTitle')}
          text={t('schedule.emptyText')}
        />
      ) : (
        <div className="space-y-3 pb-8">
          {scheduleRules.map(rule => (
            <ScheduleRuleCard key={rule.id} rule={rule} medications={medications} />
          ))}
        </div>
      )}

      <div className="fixed bottom-[5.5rem] left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-4 pointer-events-none">
        <ScheduleRuleDialog medications={medications}>
          <Button
            className="pointer-events-auto h-14 w-full rounded-full shadow-xl shadow-primary/20 text-base"
            disabled={medications.length === 0}
          >
            <Plus className="mr-2 h-5 w-5 stroke-[2.5]" />
            {t('schedule.add')}
          </Button>
        </ScheduleRuleDialog>
      </div>
    </div>
  );
};
