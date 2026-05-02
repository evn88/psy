'use client';

import { History, Pill } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { PilloHistoryEntryView, PilloMonthlyMedicationStatView } from './types';
import { EmptyState } from './EmptyState';

/**
 * Рисует компактную месячную сводку по принятым таблеткам.
 * @param props - статистика текущего месяца.
 * @returns Мобильный блок с горизонтальными барами.
 */
const MonthlyIntakeSummary = ({ stats }: { stats: PilloMonthlyMedicationStatView[] }) => {
  const t = useTranslations('Pillo');
  const locale = useLocale();
  const currentMonthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long'
  }).format(new Date());
  const visibleStats = stats.slice(0, 5);
  const maxUnits = visibleStats[0]?.totalUnits ?? 0;

  return (
    <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),hsl(var(--background)/0.95)_65%,hsl(var(--accent)/0.16))] p-4 shadow-lg shadow-primary/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/80">
            {t('history.monthlyEyebrow')}
          </p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-foreground">
            {t('history.monthlyTitle', { month: currentMonthLabel })}
          </h3>
        </div>
        <Badge className="rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-bold text-foreground">
          {t('history.monthlyTotalIntakes', {
            count: visibleStats.reduce((total, item) => total + item.intakesCount, 0)
          })}
        </Badge>
      </div>

      {visibleStats.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('history.monthlyEmpty')}</p>
      ) : (
        <div className="space-y-3">
          {visibleStats.map((item, index) => (
            <div key={item.medicationId} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.medicationName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('history.monthlyItemMeta', {
                      units: item.totalUnits,
                      count: item.intakesCount
                    })}
                  </p>
                </div>
                <span className="text-xs font-bold text-foreground/70">{index + 1}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    index % 3 === 0 && 'bg-emerald-500',
                    index % 3 === 1 && 'bg-sky-500',
                    index % 3 === 2 && 'bg-amber-500'
                  )}
                  style={{
                    width: `${maxUnits > 0 ? Math.max((item.totalUnits / maxUnits) * 100, 10) : 0}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Рисует одну строку истории приёма.
 * @param props - запись истории.
 * @returns Карточка строки истории.
 */
const HistoryEntryRow = ({ entry }: { entry: PilloHistoryEntryView }) => {
  const t = useTranslations('Pillo');

  return (
    <div className="flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-white/5 p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted/40">
        {entry.medicationPhotoUrl ? (
          <Image
            src={entry.medicationPhotoUrl}
            alt={entry.medicationName}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <Pill className="h-5 w-5 text-muted-foreground/60" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{entry.medicationName}</p>
          <Badge
            variant="secondary"
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
              entry.source === 'manual'
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            )}
          >
            {t(`history.source.${entry.source}`)}
          </Badge>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{entry.localTime}</span>
          <span>•</span>
          <span>
            {entry.doseUnits} x {entry.medicationDosage}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Bottom-sheet с историей приёма Pillo.
 * @param props - триггер, история и месячная статистика.
 * @returns Sheet для мобильной истории.
 */
export const PilloHistorySheet = ({
  children,
  historyEntries,
  monthlyIntakeStats
}: {
  children: React.ReactNode;
  historyEntries: PilloHistoryEntryView[];
  monthlyIntakeStats: PilloMonthlyMedicationStatView[];
}) => {
  const t = useTranslations('Pillo');
  const locale = useLocale();
  const groupedEntries = new Map<string, PilloHistoryEntryView[]>();

  for (const entry of historyEntries) {
    const existingEntries = groupedEntries.get(entry.localDate);

    if (existingEntries) {
      existingEntries.push(entry);
      continue;
    }

    groupedEntries.set(entry.localDate, [entry]);
  }

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="h-[85dvh] rounded-t-[2rem] border-white/10 bg-[radial-gradient(circle_at_top,hsl(var(--accent)/0.18),transparent_30%),hsl(var(--background))] px-0 pb-0 pt-0"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-white/10 px-4 py-4 text-left">
            <SheetTitle className="text-xl font-black tracking-tight">
              {t('history.title')}
            </SheetTitle>
            <SheetDescription>{t('history.description')}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
            <div className="space-y-5">
              <MonthlyIntakeSummary stats={monthlyIntakeStats} />

              {historyEntries.length === 0 ? (
                <EmptyState
                  icon={History}
                  title={t('history.emptyTitle')}
                  text={t('history.emptyText')}
                />
              ) : (
                [...groupedEntries.entries()].map(([date, entries]) => (
                  <section key={date} className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground/60">
                        {new Intl.DateTimeFormat(locale, {
                          day: 'numeric',
                          month: 'long',
                          weekday: 'short'
                        }).format(new Date(`${date}T12:00:00`))}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      >
                        {t('history.dayCount', { count: entries.length })}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {entries.map(entry => (
                        <HistoryEntryRow key={`${entry.source}-${entry.id}`} entry={entry} />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
