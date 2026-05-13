'use client';

import { History } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

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

import { EmptyState } from './empty-state';
import { HistoryEntryRow } from './history-entry-row';
import type { PilloHistoryEntryView, PilloWeeklyScheduledIntakeView } from './types';
import { WeeklyIntakeCalendar } from './weekly-intake-calendar';

const groupHistoryEntriesByDate = (historyEntries: PilloHistoryEntryView[]) => {
  const groupedEntries = new Map<string, PilloHistoryEntryView[]>();

  for (const entry of historyEntries) {
    const existingEntries = groupedEntries.get(entry.localDate);

    if (existingEntries) {
      existingEntries.push(entry);
      continue;
    }

    groupedEntries.set(entry.localDate, [entry]);
  }

  return groupedEntries;
};

export const PilloHistorySheet = ({
  children,
  currentLocalDate,
  historyEntries,
  weeklyScheduledIntakes
}: {
  children: ReactNode;
  currentLocalDate: string;
  historyEntries: PilloHistoryEntryView[];
  weeklyScheduledIntakes: PilloWeeklyScheduledIntakeView[];
}) => {
  const t = useTranslations('Pillo');
  const locale = useLocale();
  const groupedEntries = groupHistoryEntriesByDate(historyEntries);

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
                  historyEntries={historyEntries}
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
