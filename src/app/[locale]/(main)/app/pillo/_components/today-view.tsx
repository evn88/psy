import { Check, Clock3, History, Home, Pill, SkipForward } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { usePilloIntakeActions } from '../_hooks/use-pillo-intake-actions';
import type {
  PilloHistoryEntryView,
  PilloIntakeView,
  PilloMedicationView,
  PilloMonthlyMedicationStatView
} from './types';
import { EmptyState } from './empty-state';
import { ManualIntakeDialog } from './manual-intake-dialog';
import { PilloHistorySheet } from './pillo-history-sheet';
import { getStockGradientClass } from './utils';

/**
 * Диалог отмены выбора (Принял/Пропустил).
 * @param props - пропсы.
 */
const IntakeUndoDialog = ({
  children,
  intake,
  isPending,
  onUndo
}: {
  children: React.ReactNode;
  intake: PilloIntakeView;
  isPending: boolean;
  onUndo: (id: string) => void;
}) => {
  const t = useTranslations('Pillo');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-[1.75rem] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('today.undoTitle')}</DialogTitle>
          <DialogDescription>{t('today.undoDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-full font-bold"
            onClick={() => setOpen(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1 rounded-full font-bold"
            disabled={isPending}
            onClick={() => {
              onUndo(intake.id);
              setOpen(false);
            }}
          >
            {t('today.undoAction')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Отображает карточку одного приёма.
 * @param props - данные приёма.
 * @returns Карточка с действиями «Принял» и «Пропустить».
 */
const IntakeCard = ({ intake }: { intake: PilloIntakeView }) => {
  const t = useTranslations('Pillo');
  const locale = useLocale();
  const { isPending, onSkip, onTake, onUndo } = usePilloIntakeActions();
  const isDone = intake.status !== 'PENDING';

  const cardContent = (
    <Card
      className={cn(
        'group relative overflow-hidden rounded-[1.75rem] border-white/40 bg-white/60 shadow-sm backdrop-blur-md transition-all dark:border-white/10 dark:bg-black/20',
        isDone &&
          'cursor-pointer grayscale-[0.2] hover:bg-white/80 hover:shadow-md active:scale-[0.98] dark:hover:bg-black/40'
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-60',
          getStockGradientClass(intake.stockStatus)
        )}
      />

      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted/50 backdrop-blur-sm shadow-inner">
            {intake.medicationPhotoUrl ? (
              <Image
                src={intake.medicationPhotoUrl}
                alt={intake.medicationName}
                width={64}
                height={64}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <Pill className="h-8 w-8 text-muted-foreground/30" />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 flex-1 truncate text-base font-bold tracking-tight text-foreground">
                {intake.medicationName}
              </h3>
              <Badge
                variant={isDone ? 'secondary' : 'default'}
                className={cn(
                  'shrink-0 rounded-full border-none px-2 py-0.5 text-[10px] font-bold uppercase backdrop-blur-md',
                  intake.status === 'TAKEN' && 'bg-emerald-500/15 text-emerald-600',
                  intake.status === 'SKIPPED' && 'bg-rose-500/15 text-rose-600',
                  intake.status === 'PENDING' && 'bg-primary/15 text-primary'
                )}
              >
                {t(`intakeStatus.${intake.status}`)}
              </Badge>
            </div>
            <div className="mt-0.5 flex flex-col gap-0.5 text-xs font-medium text-muted-foreground/70">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-foreground font-bold">{intake.localTime}</span>
                <span className="text-muted-foreground/40">•</span>
                <span>
                  {intake.doseUnits} x {intake.medicationDosage}
                </span>
              </div>
              {intake.daysLeft !== null && (
                <span className="text-foreground/80 truncate">
                  {t('today.daysLeft', { count: intake.daysLeft })}
                </span>
              )}
              {(intake.buyAtDate !== null || intake.stockEndsAt !== null) && (
                <span
                  className={cn(
                    'font-bold truncate',
                    intake.stockStatus === 'enough' && 'text-emerald-600 dark:text-emerald-400',
                    intake.stockStatus === 'low' && 'text-amber-600 dark:text-amber-400',
                    intake.stockStatus === 'empty' && 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {intake.buyAtDate !== null ? (
                    <>
                      {t('today.buyAtDate', {
                        date: new Intl.DateTimeFormat(locale, {
                          month: 'short',
                          day: 'numeric'
                        }).format(new Date(intake.buyAtDate))
                      })}
                      {intake.stockEndsAt !== null && (
                        <>
                          {' '}
                          <span className="font-medium opacity-70">
                            {t('today.stockEndsAt', {
                              date: new Intl.DateTimeFormat(locale, {
                                month: 'short',
                                day: 'numeric'
                              }).format(new Date(intake.stockEndsAt))
                            })}
                          </span>
                        </>
                      )}
                    </>
                  ) : intake.stockEndsAt !== null ? (
                    t('today.stockEndsSoon', {
                      date: new Intl.DateTimeFormat(locale, {
                        month: 'short',
                        day: 'numeric'
                      }).format(new Date(intake.stockEndsAt))
                    })
                  ) : null}
                </span>
              )}
            </div>
          </div>
        </div>

        {intake.comment && (
          <p className="rounded-2xl bg-muted/30 p-3 text-sm italic text-muted-foreground/80">
            {intake.comment}
          </p>
        )}

        {intake.stockStatus !== 'enough' && !isDone && (
          <div
            className={cn(
              'rounded-2xl border px-3 py-2 text-xs font-medium',
              intake.stockStatus === 'empty'
                ? 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span>{t('today.lowStockWarning')}</span>
              {intake.daysLeft !== null && (
                <span className="shrink-0 font-bold opacity-80">
                  {t('today.daysLeft', { count: intake.daysLeft })}
                </span>
              )}
            </div>
          </div>
        )}

        {!isDone && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              disabled={isDone || isPending}
              className="h-11 rounded-full font-bold shadow-md shadow-primary/20 transition-all active:scale-95"
              onClick={() => onTake(intake.id)}
            >
              <Check className="mr-2 h-4 w-4 stroke-[3px]" />
              {t('today.take')}
            </Button>
            <Button
              disabled={isDone || isPending}
              variant="outline"
              className="h-11 rounded-full border-white/40 bg-white/40 font-bold backdrop-blur-sm transition-all active:scale-95 dark:border-white/10 dark:bg-white/5"
              onClick={() => onSkip(intake.id)}
            >
              <SkipForward className="mr-2 h-4 w-4" />
              {t('today.skip')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isDone) {
    return (
      <IntakeUndoDialog intake={intake} isPending={isPending} onUndo={onUndo}>
        <div
          role="button"
          tabIndex={0}
          className="rounded-[1.75rem] outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {cardContent}
        </div>
      </IntakeUndoDialog>
    );
  }

  return cardContent;
};

/**
 * Рисует компактный блок быстрого подтверждения ближайшего приёма.
 * @param props - ближайший pending-приём.
 * @returns Карточка с основным действием для главного экрана.
 */
const QuickTakeCard = ({ intake }: { intake: PilloIntakeView }) => {
  const t = useTranslations('Pillo');
  const { isPending, onTake } = usePilloIntakeActions();

  return (
    <Card className="overflow-hidden rounded-[1.75rem] border-primary/15 bg-[linear-gradient(135deg,hsl(var(--primary)/0.16),hsl(var(--background)/0.92)_58%,hsl(var(--accent)/0.16))] shadow-lg shadow-primary/10 backdrop-blur-xl dark:border-primary/10">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
            <Clock3 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/80">
              {t('today.quickTakeEyebrow')}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-foreground">
                {intake.localTime}
              </span>
              <Badge className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-bold text-foreground shadow-sm">
                {intake.doseUnits} x {intake.medicationDosage}
              </Badge>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-foreground/85">
              {intake.medicationName}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t('today.quickTakeDescription')}</p>
          </div>
        </div>

        <Button
          disabled={isPending}
          className="h-12 w-full rounded-full font-bold shadow-md shadow-primary/20 transition-all active:scale-95"
          onClick={() => onTake(intake.id)}
        >
          <Check className="mr-2 h-4 w-4 stroke-[3px]" />
          {t('today.quickTakeAction')}
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * Рисует главный экран сегодняшних приёмов.
 * @param props - приёмы текущего дня.
 * @returns Экран «Сегодня».
 */
export const TodayView = ({
  historyEntries,
  intakes,
  medications,
  monthlyIntakeStats
}: {
  historyEntries: PilloHistoryEntryView[];
  intakes: PilloIntakeView[];
  medications: PilloMedicationView[];
  monthlyIntakeStats: PilloMonthlyMedicationStatView[];
}) => {
  const t = useTranslations('Pillo');
  const nextPendingIntake = intakes.find(intake => intake.status === 'PENDING') ?? null;
  const pendingCount = intakes.filter(intake => intake.status === 'PENDING').length;
  const hasMedications = medications.length > 0;

  if (intakes.length === 0) {
    return (
      <div className="space-y-4 pb-4">
        <EmptyState icon={Home} title={t('today.emptyTitle')} text={t('today.emptyText')} />
        <div className="grid grid-cols-2 gap-3">
          {hasMedications ? (
            <ManualIntakeDialog medications={medications}>
              <Button className="h-12 w-full rounded-full font-bold">
                <Check className="mr-2 h-4 w-4 stroke-[3px]" />
                {t('today.manualTakeAction')}
              </Button>
            </ManualIntakeDialog>
          ) : (
            <Button className="h-12 w-full rounded-full font-bold" disabled>
              <Check className="mr-2 h-4 w-4 stroke-[3px]" />
              {t('today.manualTakeAction')}
            </Button>
          )}

          <PilloHistorySheet
            historyEntries={historyEntries}
            monthlyIntakeStats={monthlyIntakeStats}
          >
            <Button
              variant="outline"
              className="h-12 w-full rounded-full border-white/40 bg-white/40 font-bold backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
            >
              <History className="mr-2 h-4 w-4" />
              {t('history.openAction')}
            </Button>
          </PilloHistorySheet>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-2 gap-3">
        {hasMedications ? (
          <ManualIntakeDialog medications={medications}>
            <Button
              variant="outline"
              className="h-11 w-full rounded-full border-white/40 bg-white/40 font-bold backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
            >
              <Check className="mr-2 h-4 w-4 stroke-[3px]" />
              {t('today.manualTakeAction')}
            </Button>
          </ManualIntakeDialog>
        ) : (
          <Button
            variant="outline"
            disabled
            className="h-11 w-full rounded-full border-white/40 bg-white/40 font-bold backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
          >
            <Check className="mr-2 h-4 w-4 stroke-[3px]" />
            {t('today.manualTakeAction')}
          </Button>
        )}

        <PilloHistorySheet historyEntries={historyEntries} monthlyIntakeStats={monthlyIntakeStats}>
          <Button
            variant="outline"
            className="h-11 w-full rounded-full border-white/40 bg-white/40 font-bold backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
          >
            <History className="mr-2 h-4 w-4" />
            {t('history.openAction')}
          </Button>
        </PilloHistorySheet>
      </div>

      {nextPendingIntake && <QuickTakeCard intake={nextPendingIntake} />}

      <div className="flex items-center justify-between px-1 pt-1">
        <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground/60">
          {t('today.listTitle')}
        </h2>
        <Badge
          variant="secondary"
          className="rounded-full bg-muted/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
        >
          {t('pendingCount', { count: pendingCount })}
        </Badge>
      </div>

      {intakes.map(intake => (
        <IntakeCard key={intake.id} intake={intake} />
      ))}
    </div>
  );
};
