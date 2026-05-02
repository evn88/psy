import { useTransition } from 'react';
import Image from 'next/image';
import { Pill, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { addPilloMedicationPackageAction } from '../actions';
import { AddPackageConfirmDialog } from './add-package-confirm-dialog';
import { MedicationDialog } from './medication-dialog';
import type { PilloMedicationView } from './types';

/**
 * Отображает карточку таблетки.
 * @param props - таблетка.
 * @returns Карточка остатка и действий.
 */
export const MedicationCard = ({ medication }: { medication: PilloMedicationView }) => {
  const t = useTranslations('Pillo');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const stockPercentage = medication.unitsPerPackage
    ? Math.min((medication.stockUnits / medication.unitsPerPackage) * 100, 100)
    : null;

  return (
    <MedicationDialog medication={medication}>
      <Card
        role="button"
        tabIndex={0}
        className={cn(
          'group relative overflow-hidden rounded-[24px] border border-black/5 bg-white/60 shadow-sm backdrop-blur-xl transition-all hover:bg-white/80 hover:shadow-md active:scale-[0.98] dark:border-white/10 dark:bg-black/40 dark:hover:bg-black/60',
          medication.stockStatus === 'empty' && 'border-rose-200/50 dark:border-rose-900/30',
          medication.stockStatus === 'low' && 'border-amber-200/50 dark:border-amber-900/30'
        )}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              {medication.photoUrl ? (
                <Image
                  src={medication.photoUrl}
                  alt={medication.name}
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
                <h3 className="min-w-0 flex-1 truncate text-[16px] font-semibold tracking-tight text-foreground/90 transition-colors group-hover:text-foreground">
                  {medication.name}
                </h3>
                <Badge
                  variant="secondary"
                  className={cn(
                    'shrink-0 rounded-full border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md',
                    medication.stockStatus === 'enough' &&
                      'bg-emerald-100/60 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
                    medication.stockStatus === 'low' &&
                      'bg-amber-100/60 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
                    medication.stockStatus === 'empty' &&
                      'bg-rose-100/60 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                  )}
                >
                  {t(`stockStatus.${medication.stockStatus}`)}
                </Badge>
              </div>

              <p className="mt-0.5 truncate text-[13px] font-medium text-muted-foreground/80">
                {medication.dosageValue !== null && medication.dosageUnit ? (
                  <>
                    {medication.dosageValue}{' '}
                    {t(`dosageUnits.${medication.dosageUnit.toLowerCase().replace('.', '')}`)}
                  </>
                ) : (
                  medication.dosage
                )}
                <span className="mx-1.5 text-muted-foreground/40">•</span>
                {t.raw(`medicationForms`)?.[medication.form.toLowerCase().replace('.', '')] ||
                  medication.form}
              </p>

              {(medication.buyAtDate !== null || medication.stockEndsAt !== null) && (
                <p
                  className={cn(
                    'mt-1 truncate text-xs font-bold',
                    medication.stockStatus === 'enough' && 'text-emerald-600 dark:text-emerald-400',
                    medication.stockStatus === 'low' && 'text-amber-600 dark:text-amber-400',
                    medication.stockStatus === 'empty' && 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {medication.buyAtDate !== null ? (
                    <>
                      {t('today.buyAtDate', {
                        date: new Intl.DateTimeFormat(locale, {
                          month: 'short',
                          day: 'numeric'
                        }).format(new Date(medication.buyAtDate))
                      })}
                      {medication.stockEndsAt !== null && (
                        <>
                          {' '}
                          <span className="font-medium opacity-70">
                            {t('today.stockEndsAt', {
                              date: new Intl.DateTimeFormat(locale, {
                                month: 'short',
                                day: 'numeric'
                              }).format(new Date(medication.stockEndsAt))
                            })}
                          </span>
                        </>
                      )}
                    </>
                  ) : medication.stockEndsAt !== null ? (
                    t('today.stockEndsSoon', {
                      date: new Intl.DateTimeFormat(locale, {
                        month: 'short',
                        day: 'numeric'
                      }).format(new Date(medication.stockEndsAt))
                    })
                  ) : null}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-foreground/90">
                    {medication.stockUnits}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t('schedule.doseUnitsShort')}
                  </span>
                  {medication.daysLeft !== null && (
                    <span className="ml-1.5 text-xs font-semibold text-muted-foreground/70">
                      ({t('today.daysLeft', { count: medication.daysLeft })})
                    </span>
                  )}
                </div>
                {medication.unitsPerPackage && stockPercentage !== null && (
                  <span className="text-[11px] font-bold text-muted-foreground/50">
                    {Math.round(stockPercentage)}%
                  </span>
                )}
              </div>

              {stockPercentage !== null && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-1000 ease-out',
                      medication.stockStatus === 'enough'
                        ? 'bg-emerald-500 dark:bg-emerald-400'
                        : medication.stockStatus === 'low'
                          ? 'bg-amber-500 dark:bg-amber-400'
                          : 'bg-rose-500 dark:bg-rose-400'
                    )}
                    style={{ width: `${stockPercentage}%` }}
                  />
                </div>
              )}
            </div>

            <div
              className="flex shrink-0 items-center gap-1.5 pb-0.5"
              onClick={event => event.stopPropagation()}
            >
              {medication.unitsPerPackage ? (
                <AddPackageConfirmDialog
                  onConfirm={() => {
                    startTransition(() => {
                      void addPilloMedicationPackageAction(medication.id);
                    });
                  }}
                >
                  <Button
                    variant="default"
                    size="icon"
                    disabled={isPending}
                    className="h-8 w-8 rounded-full shadow-sm transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </AddPackageConfirmDialog>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </MedicationDialog>
  );
};
