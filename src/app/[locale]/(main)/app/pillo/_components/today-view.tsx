import { Check, Home, SkipForward } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { usePilloIntakeActions } from '../_hooks/use-pillo-intake-actions';
import type { PilloIntakeView } from './types';
import { EmptyState } from './empty-state';
import { getStockGradientClass } from './utils';

/**
 * Отображает карточку одного приёма.
 * @param props - данные приёма.
 * @returns Карточка с действиями «Принял» и «Пропустить».
 */
const IntakeCard = ({ intake }: { intake: PilloIntakeView }) => {
  const t = useTranslations('Pillo');
  const { isPending, onSkip, onTake } = usePilloIntakeActions();
  const isDone = intake.status !== 'PENDING';

  return (
    <Card className="overflow-hidden rounded-[1.5rem] border-white/60 bg-card/90 shadow-sm dark:border-white/10">
      <div className={cn('h-1.5 bg-gradient-to-r', getStockGradientClass(intake.stockStatus))} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{intake.medicationName}</CardTitle>
            <CardDescription>
              {intake.localTime} · {intake.doseUnits} x {intake.medicationDosage}
            </CardDescription>
          </div>
          <Badge variant={isDone ? 'secondary' : 'default'} className="rounded-full">
            {t(`intakeStatus.${intake.status}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {intake.comment && <p className="text-sm text-muted-foreground">{intake.comment}</p>}
        {intake.stockStatus !== 'enough' && (
          <div className="rounded-2xl bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
            {t('today.lowStockWarning')}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={isDone || isPending}
            className="rounded-full"
            onClick={() => onTake(intake.id)}
          >
            <Check className="mr-2 h-4 w-4" />
            {t('today.take')}
          </Button>
          <Button
            disabled={isDone || isPending}
            variant="outline"
            className="rounded-full"
            onClick={() => onSkip(intake.id)}
          >
            <SkipForward className="mr-2 h-4 w-4" />
            {t('today.skip')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
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
    <div className="space-y-3">
      {intakes.map(intake => (
        <IntakeCard key={intake.id} intake={intake} />
      ))}
    </div>
  );
};
