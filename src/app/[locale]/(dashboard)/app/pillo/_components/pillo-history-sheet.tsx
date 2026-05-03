'use client';

import { eachDayOfInterval, format, subDays } from 'date-fns';
import { History, Pill } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';

import type { AppLocale } from '@/i18n/config';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDateFnsLocale } from '@/lib/date-locale';
import { cn } from '@/lib/utils';
import type { PilloHistoryEntryView, PilloWeeklyScheduledIntakeView } from './types';
import { EmptyState } from './empty-state';

/**
 * Агрегированная сводка по конкретной таблетке внутри дня.
 */
type DailyMedicationSummary = {
  count: number;
  medicationId: string;
  medicationName: string;
};

/**
 * Сводка по одному дню недельного календаря.
 */
type WeeklyDaySummary = {
  adherencePercent: number;
  date: Date;
  dateKey: string;
  missedCount: number;
  missedMedications: DailyMedicationSummary[];
  pendingCount: number;
  pendingMedications: DailyMedicationSummary[];
  plannedCount: number;
  takenCount: number;
  takenMedications: DailyMedicationSummary[];
};

/**
 * Возвращает цветовые классы для статуса дня.
 * @param day - дневная сводка.
 * @returns Классы контейнера и прогресса.
 */
const getWeeklyDayTone = (day: WeeklyDaySummary) => {
  if (day.missedCount > 0) {
    return {
      cardClassName: 'border-rose-500/20 bg-rose-500/[0.07]',
      progressClassName: 'text-rose-500',
      trackClassName: 'stroke-rose-500/15'
    };
  }

  if (day.pendingCount > 0) {
    return {
      cardClassName: 'border-amber-500/20 bg-amber-500/[0.07]',
      progressClassName: 'text-amber-500',
      trackClassName: 'stroke-amber-500/15'
    };
  }

  if (day.plannedCount > 0) {
    return {
      cardClassName: 'border-emerald-500/20 bg-emerald-500/[0.07]',
      progressClassName: 'text-emerald-500',
      trackClassName: 'stroke-emerald-500/15'
    };
  }

  return {
    cardClassName: 'border-white/10 bg-background/40',
    progressClassName: 'text-muted-foreground/50',
    trackClassName: 'stroke-white/10 dark:stroke-white/10'
  };
};

/**
 * Возвращает Date из локальной YYYY-MM-DD строки Pillo без смещения по таймзоне.
 * @param value - локальная дата из истории Pillo.
 * @returns Date в локальном часовом поясе.
 */
const getLocalHistoryDate = (value: string) => {
  return new Date(`${value}T12:00:00`);
};

/**
 * Добавляет запись таблетки в агрегированную группу дня.
 * @param items - текущий набор таблеток.
 * @param entry - запись планового приёма.
 * @returns Обновлённый список по таблеткам.
 */
const appendMedicationSummary = (
  items: DailyMedicationSummary[],
  entry: PilloWeeklyScheduledIntakeView
) => {
  const current = items.find(item => item.medicationId === entry.medicationId);

  if (current) {
    current.count += 1;
    return items;
  }

  return [
    ...items,
    {
      count: 1,
      medicationId: entry.medicationId,
      medicationName: entry.medicationName
    }
  ];
};

/**
 * Формирует недельную сводку по плановым приёмам.
 * @param params - текущая локальная дата, записи недели и локаль.
 * @returns Карточки дней за последние 7 суток.
 */
const buildWeeklyDaySummaries = ({
  currentLocalDate,
  weeklyScheduledIntakes
}: {
  currentLocalDate: string;
  weeklyScheduledIntakes: PilloWeeklyScheduledIntakeView[];
}) => {
  const referenceDate = getLocalHistoryDate(currentLocalDate);
  const weekDays = eachDayOfInterval({
    start: subDays(referenceDate, 6),
    end: referenceDate
  });
  const weeklyEntriesByDate = new Map<string, PilloWeeklyScheduledIntakeView[]>();

  for (const entry of weeklyScheduledIntakes) {
    const existingEntries = weeklyEntriesByDate.get(entry.localDate);

    if (existingEntries) {
      existingEntries.push(entry);
      continue;
    }

    weeklyEntriesByDate.set(entry.localDate, [entry]);
  }

  return weekDays.map(day => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayEntries = weeklyEntriesByDate.get(dateKey) ?? [];
    let missedCount = 0;
    let pendingCount = 0;
    let takenCount = 0;
    let takenMedications: DailyMedicationSummary[] = [];
    let missedMedications: DailyMedicationSummary[] = [];
    let pendingMedications: DailyMedicationSummary[] = [];

    for (const entry of dayEntries) {
      if (entry.status === 'TAKEN') {
        takenCount += 1;
        takenMedications = appendMedicationSummary(takenMedications, entry);
        continue;
      }

      if (
        entry.status === 'SKIPPED' ||
        entry.status === 'MISSED' ||
        (entry.status === 'PENDING' && entry.localDate < currentLocalDate)
      ) {
        missedCount += 1;
        missedMedications = appendMedicationSummary(missedMedications, entry);
        continue;
      }

      pendingCount += 1;
      pendingMedications = appendMedicationSummary(pendingMedications, entry);
    }

    return {
      adherencePercent:
        dayEntries.length > 0 ? Math.round((takenCount / dayEntries.length) * 100) : 0,
      date: day,
      dateKey,
      missedCount,
      missedMedications,
      pendingCount,
      pendingMedications,
      plannedCount: dayEntries.length,
      takenCount,
      takenMedications
    } satisfies WeeklyDaySummary;
  });
};

/**
 * Возвращает строку с перечнем таблеток и количеством повторов.
 * @param items - агрегированные записи по таблеткам.
 * @returns Краткая строка для карточки дня.
 */
const formatMedicationSummary = (items: DailyMedicationSummary[]) => {
  return items
    .map(item => {
      return item.count > 1 ? `${item.medicationName} x${item.count}` : item.medicationName;
    })
    .join(', ');
};

/**
 * Компактный блок со списком таблеток для одного статуса дня.
 * @param props - цвет, заголовок и строка с таблетками.
 * @returns Мобильный контент-блок внутри карточки дня.
 */
const WeeklyMedicationBlock = ({
  items,
  label,
  toneClassName
}: {
  items: DailyMedicationSummary[];
  label: string;
  toneClassName: string;
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn('rounded-2xl border px-3 py-2.5', toneClassName)}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/75">
        {label}
      </p>
      <p className="mt-1 text-sm leading-snug text-foreground">{formatMedicationSummary(items)}</p>
    </div>
  );
};

/**
 * Декоративный burst-конфетти для полностью закрытого дня.
 * @returns Анимированные частицы вокруг индикатора.
 */
const ConfettiBurst = () => {
  const pieces = [
    { colorClassName: 'bg-emerald-400', x: '-34px', y: '-16px', rotation: '-40deg' },
    { colorClassName: 'bg-sky-400', x: '-28px', y: '20px', rotation: '32deg' },
    { colorClassName: 'bg-amber-400', x: '-10px', y: '-34px', rotation: '12deg' },
    { colorClassName: 'bg-rose-400', x: '8px', y: '-30px', rotation: '-14deg' },
    { colorClassName: 'bg-fuchsia-400', x: '28px', y: '-18px', rotation: '38deg' },
    { colorClassName: 'bg-cyan-400', x: '34px', y: '12px', rotation: '-28deg' },
    { colorClassName: 'bg-lime-400', x: '18px', y: '30px', rotation: '20deg' },
    { colorClassName: 'bg-orange-400', x: '-16px', y: '34px', rotation: '-18deg' }
  ];

  return (
    <div className="pointer-events-none absolute inset-0">
      {pieces.map((piece, index) => (
        <span
          key={`${piece.x}-${piece.y}`}
          className={cn(
            'absolute left-1/2 top-1/2 h-2 w-1 rounded-full opacity-0 animate-pillo-confetti',
            piece.colorClassName
          )}
          style={
            {
              animationDelay: `${index * 60}ms`,
              ['--confetti-rotate' as string]: piece.rotation,
              ['--confetti-x' as string]: piece.x,
              ['--confetti-y' as string]: piece.y
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
};

/**
 * Круговой индикатор выполнения плана за день.
 * @param props - дневная сводка.
 * @returns SVG-ring с процентом и конфетти для полного выполнения.
 */
const WeeklyProgressRing = ({ day }: { day: WeeklyDaySummary }) => {
  const t = useTranslations('Pillo');
  const tone = getWeeklyDayTone(day);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(Math.max(day.adherencePercent, 0), 100);
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;
  const isPerfectDay =
    day.plannedCount > 0 && day.takenCount === day.plannedCount && day.pendingCount === 0;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20">
        <svg
          viewBox="0 0 80 80"
          className="-rotate-90 h-full w-full drop-shadow-[0_8px_18px_rgba(0,0,0,0.12)]"
          aria-hidden
        >
          <circle
            cx="40"
            cy="40"
            r={radius}
            strokeWidth="8"
            className={cn('fill-none', tone.trackClassName)}
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            strokeWidth="8"
            strokeLinecap="round"
            className={cn('fill-none transition-all duration-500', tone.progressClassName)}
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[0.95rem] font-black tracking-tight text-foreground sm:text-[1.05rem]">
            {clampedPercent}%
          </span>
        </div>

        {isPerfectDay && <ConfettiBurst />}
      </div>

      {isPerfectDay && (
        <Badge className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
          {t('history.weeklyPerfectDay')}
        </Badge>
      )}
    </div>
  );
};

/**
 * Рисует недельную сводку по плановым приёмам.
 * @param props - текущая локальная дата и записи недели.
 * @returns Верхний блок истории с акцентом на пропуски.
 */
const WeeklyIntakeCalendar = ({
  currentLocalDate,
  weeklyScheduledIntakes
}: {
  currentLocalDate: string;
  weeklyScheduledIntakes: PilloWeeklyScheduledIntakeView[];
}) => {
  const t = useTranslations('Pillo');
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale as AppLocale);
  const daySummaries = buildWeeklyDaySummaries({
    currentLocalDate,
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
  currentLocalDate,
  historyEntries,
  weeklyScheduledIntakes
}: {
  children: React.ReactNode;
  currentLocalDate: string;
  historyEntries: PilloHistoryEntryView[];
  weeklyScheduledIntakes: PilloWeeklyScheduledIntakeView[];
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
            <Tabs defaultValue="summary" className="space-y-4">
              <TabsList className="grid h-auto w-full grid-cols-2 rounded-[1.1rem] bg-white/50 p-1 dark:bg-white/5">
                <TabsTrigger
                  value="summary"
                  className="rounded-[0.9rem] py-2 text-xs font-bold uppercase tracking-[0.16em] data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {t('history.tabs.summary')}
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="rounded-[0.9rem] py-2 text-xs font-bold uppercase tracking-[0.16em] data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {t('history.tabs.timeline')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-0 space-y-4">
                <p className="px-1 text-xs text-muted-foreground">
                  {t('history.tabs.summaryHint')}
                </p>
                <WeeklyIntakeCalendar
                  currentLocalDate={currentLocalDate}
                  weeklyScheduledIntakes={weeklyScheduledIntakes}
                />
              </TabsContent>

              <TabsContent value="timeline" className="mt-0 space-y-4">
                <p className="px-1 text-xs text-muted-foreground">
                  {t('history.tabs.timelineHint')}
                </p>
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
