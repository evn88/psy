import { Check, Home, Pill, SkipForward } from 'lucide-react';
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
import type { PilloIntakeView } from './types';
import { EmptyState } from './empty-state';
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
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold tracking-tight text-foreground">
                  {intake.medicationName}
                </h3>
                <div className="mt-0.5 flex flex-col gap-0.5 text-xs font-medium text-muted-foreground/70">
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground font-bold">{intake.localTime}</span>
                    <span className="text-muted-foreground/40">•</span>
                    <span>
                      {intake.doseUnits} x {intake.medicationDosage}
                    </span>
                  </div>
                  {intake.daysLeft !== null && (
                    <span className="text-foreground/80">
                      {t('today.daysLeft', { count: intake.daysLeft })}
                    </span>
                  )}
                  {intake.buyAtDate !== null && (
                    <span
                      className={cn(
                        'font-bold',
                        intake.stockStatus === 'enough' && 'text-emerald-600 dark:text-emerald-400',
                        intake.stockStatus === 'low' && 'text-amber-600 dark:text-amber-400',
                        intake.stockStatus === 'empty' && 'text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {t('today.buyAtDate', {
                        date: new Intl.DateTimeFormat(locale, {
                          month: 'short',
                          day: 'numeric'
                        }).format(new Date(intake.buyAtDate))
                      })}
                    </span>
                  )}
                </div>
              </div>
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
 * Рисует главный экран сегодняшних приёмов.
 * @param props - приёмы текущего дня.
 * @returns Экран «Сегодня».
 */
export const TodayView = ({ intakes }: { intakes: PilloIntakeView[] }) => {
  const t = useTranslations('Pillo');

  if (intakes.length === 0) {
    return <EmptyState icon={Home} title={t('today.emptyTitle')} text={t('today.emptyText')} />;
  }

  return (
    <div className="space-y-4 pb-4">
      {intakes.map(intake => (
        <IntakeCard key={intake.id} intake={intake} />
      ))}
    </div>
  );
};
