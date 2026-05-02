import Image from 'next/image';
import { Pill } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ScheduleRuleDialog } from './schedule-rule-dialog';
import type { PilloMedicationView, PilloScheduleRuleView } from './types';

/**
 * Отображает карточку правила расписания.
 * @param props - правило и таблетки.
 * @returns Карточка правила.
 */
export const ScheduleRuleCard = ({
  medications,
  rule
}: {
  medications: PilloMedicationView[];
  rule: PilloScheduleRuleView;
}) => {
  const t = useTranslations('Pillo');

  return (
    <ScheduleRuleDialog rule={rule} medications={medications}>
      <Card
        role="button"
        tabIndex={0}
        className={cn(
          'group relative overflow-hidden rounded-[24px] border border-black/5 bg-white/60 shadow-sm backdrop-blur-xl transition-all hover:bg-white/80 hover:shadow-md active:scale-[0.98] dark:border-white/10 dark:bg-black/40 dark:hover:bg-black/60',
          !rule.isActive && 'opacity-60 grayscale-[0.3]'
        )}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              {rule.medicationPhotoUrl ? (
                <Image
                  src={rule.medicationPhotoUrl}
                  alt={rule.medicationName}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <Pill className="h-7 w-7 text-primary/40" />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[16px] font-semibold tracking-tight text-foreground/90 transition-colors group-hover:text-foreground">
                    {rule.medicationName}
                  </h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-muted-foreground/80">
                    <span className="text-foreground">{rule.time}</span>
                    <span className="text-muted-foreground/40">•</span>
                    <span>
                      {rule.doseUnits} {t('schedule.doseUnitsShort')}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className={cn(
                    'shrink-0 rounded-full border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md',
                    rule.isActive
                      ? 'bg-emerald-100/60 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'bg-muted/50 text-muted-foreground/70'
                  )}
                >
                  {rule.isActive ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <span
                  key={day}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-colors',
                    rule.daysOfWeek.includes(day)
                      ? 'bg-foreground text-background shadow-sm'
                      : 'bg-black/5 text-muted-foreground/50 dark:bg-white/5'
                  )}
                >
                  {t(`daysShort.${day}`)}
                </span>
              ))}
            </div>

            {rule.comment && (
              <p className="rounded-xl bg-black/5 p-3 text-[13px] italic text-muted-foreground/80 dark:bg-white/5">
                {rule.comment}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </ScheduleRuleDialog>
  );
};
