import { format } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import type { AppLocale } from '@/i18n/config';
import { getDateFnsLocale } from '@/lib/date-locale';
import { cn } from '@/lib/utils';

import { buildWeeklyDaySummaries, getWeeklyDayTone } from './pillo-history-utils';
import type { PilloHistoryEntryView, PilloWeeklyScheduledIntakeView } from './types';
import { WeeklyMedicationBlock } from './weekly-medication-block';
import { WeeklyProgressRing } from './weekly-progress-ring';

export const WeeklyIntakeCalendar = ({
  currentLocalDate,
  historyEntries,
  weeklyScheduledIntakes
}: {
  currentLocalDate: string;
  historyEntries: PilloHistoryEntryView[];
  weeklyScheduledIntakes: PilloWeeklyScheduledIntakeView[];
}) => {
  const t = useTranslations('Pillo');
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale as AppLocale);
  const daySummaries = buildWeeklyDaySummaries({
    currentLocalDate,
    historyEntries,
    weeklyScheduledIntakes
  });
  const totalPlanned = daySummaries.reduce((total, day) => total + day.plannedCount, 0);
  const totalTaken = daySummaries.reduce((total, day) => total + day.takenCount, 0);

  return (
    <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),hsl(var(--background)/0.95)_65%,hsl(var(--accent)/0.16))] p-4 shadow-lg shadow-primary/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/80">
            {t('history.weeklyEyebrow')}
          </p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-foreground">
            {t('history.weeklyTitle')}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{t('history.weeklyHint')}</p>
        </div>
        <Badge className="rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-bold text-foreground">
          {t('history.weeklySummary', {
            planned: totalPlanned,
            taken: totalTaken
          })}
        </Badge>
      </div>

      {totalPlanned === 0 ? (
        <p className="text-sm text-muted-foreground">{t('history.weeklyEmpty')}</p>
      ) : (
        <div className="space-y-3">
          {daySummaries.map(day => {
            const tone = getWeeklyDayTone(day);

            return (
              <div
                key={day.dateKey}
                className={cn(
                  'space-y-3 rounded-[1.5rem] border p-3.5 shadow-sm shadow-black/5',
                  tone.cardClassName
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                      {format(day.date, 'EEEE', { locale: dateLocale })}
                    </p>
                    <h4 className="text-sm font-bold text-foreground">
                      {format(day.date, 'd MMMM', { locale: dateLocale })}
                    </h4>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {day.plannedCount > 0 ? (
                        <>
                          <Badge className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold text-foreground">
                            {t('history.weeklySummary', {
                              planned: day.plannedCount,
                              taken: day.takenCount
                            })}
                          </Badge>
                          {day.missedCount > 0 && (
                            <Badge className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                              {t('history.weeklyMissedCount', { count: day.missedCount })}
                            </Badge>
                          )}
                          {day.pendingCount > 0 && (
                            <Badge className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                              {t('history.weeklyPendingCount', { count: day.pendingCount })}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-bold uppercase"
                        >
                          {t('history.weeklyNoPlan')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {day.plannedCount > 0 && <WeeklyProgressRing day={day} />}
                </div>

                {day.plannedCount > 0 && (
                  <div className="grid gap-2">
                    <WeeklyMedicationBlock
                      items={day.takenMedications}
                      label={t('history.weeklyTakenLabel')}
                      toneClassName="border-emerald-500/20 bg-emerald-500/10"
                    />
                    <WeeklyMedicationBlock
                      items={day.missedMedications}
                      label={t('history.weeklyMissedLabel')}
                      toneClassName="border-rose-500/20 bg-rose-500/10"
                    />
                    <WeeklyMedicationBlock
                      items={day.pendingMedications}
                      label={t('history.weeklyPendingLabel')}
                      toneClassName="border-amber-500/20 bg-amber-500/10"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
