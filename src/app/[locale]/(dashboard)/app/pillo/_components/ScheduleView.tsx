import { CalendarClock, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { EmptyState } from './EmptyState';
import { ScheduleRuleCard } from './ScheduleRuleCard';
import { ScheduleRuleDialog } from './ScheduleRuleDialog';
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
      <ScheduleRuleDialog medications={medications}>
        <Button className="h-12 w-full rounded-full" disabled={medications.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          {t('schedule.add')}
        </Button>
      </ScheduleRuleDialog>
      {scheduleRules.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={t('schedule.emptyTitle')}
          text={t('schedule.emptyText')}
        />
      ) : (
        <div className="space-y-3">
          {scheduleRules.map(rule => (
            <ScheduleRuleCard key={rule.id} rule={rule} medications={medications} />
          ))}
        </div>
      )}
    </div>
  );
};
