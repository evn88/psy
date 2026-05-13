import { Home } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EmptyState } from './empty-state';
import { HistoryEntryRow } from './history-entry-row';
import { IntakeCard } from './intake-card';
import { TodayFloatingActions } from './today-floating-actions';
import type {
  PilloHistoryEntryView,
  PilloIntakeView,
  PilloMedicationView,
  PilloWeeklyScheduledIntakeView
} from './types';

export const TodayView = ({
  currentLocalDate,
  historyEntries,
  intakes,
  medications,
  weeklyScheduledIntakes
}: {
  currentLocalDate: string;
  historyEntries: PilloHistoryEntryView[];
  intakes: PilloIntakeView[];
  medications: PilloMedicationView[];
  weeklyScheduledIntakes: PilloWeeklyScheduledIntakeView[];
}) => {
  const t = useTranslations('Pillo');
  const hasMedications = medications.length > 0;
  const todayManualEntries = historyEntries.filter(entry => {
    return entry.source === 'manual' && entry.localDate === currentLocalDate;
  });
  const hasTodayEntries = intakes.length > 0 || todayManualEntries.length > 0;

  return (
    <>
      {!hasTodayEntries ? (
        <div className="space-y-4 pb-4">
          <EmptyState icon={Home} title={t('today.emptyTitle')} text={t('today.emptyText')} />
        </div>
      ) : (
        <div className="space-y-4 pb-12">
          {intakes.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1 pt-1">
                <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground/60">
                  {t('today.listTitle')}
                </h2>
              </div>

              {intakes.map(intake => (
                <IntakeCard key={intake.id} intake={intake} />
              ))}
            </section>
          )}

          {todayManualEntries.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1 pt-1">
                <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground/60">
                  {t('history.source.manual')}
                </h2>
              </div>

              <div className="space-y-2">
                {todayManualEntries.map(entry => (
                  <HistoryEntryRow key={`${entry.source}-${entry.id}`} entry={entry} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <TodayFloatingActions
        currentLocalDate={currentLocalDate}
        hasMedications={hasMedications}
        historyEntries={historyEntries}
        medications={medications}
        weeklyScheduledIntakes={weeklyScheduledIntakes}
      />
    </>
  );
};
