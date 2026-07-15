'use client';

import React from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import {
  getClientDashboardStats,
  saveClientDashboardConfig
} from '@/app/api/actions/dashboard-actions';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import type { WidgetConfig } from '@/lib/dashboard-config';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  PendingSurveysWidget,
  NextSessionWidget,
  CompletedSurveysWidget,
  NextStepsWidget,
  AccountOverviewWidget,
  BalanceWidget,
  FilesWidget,
  NotesWidget
} from './_components/widgets';

const AVAILABLE_WIDGETS = {
  pendingSurveys: PendingSurveysWidget,
  nextSession: NextSessionWidget,
  completedSurveys: CompletedSurveysWidget,
  nextSteps: NextStepsWidget,
  accountOverview: AccountOverviewWidget,
  balance: BalanceWidget,
  files: FilesWidget,
  notes: NotesWidget
};

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: '1', type: 'pendingSurveys' },
  { id: '2', type: 'nextSession' },
  { id: '3', type: 'nextSteps' }
];

export default function MyDashboardPage() {
  const t = useTranslations('My');
  const { data, isLoading } = useSWR('clientDashboardStats', () => getClientDashboardStats());

  const widgetLabels = {
    pendingSurveys: t('pendingSurveys'),
    nextSession: t('nextSession'),
    completedSurveys: t('completedSurveys'),
    nextSteps: t('nextStepsTitle'),
    accountOverview: t('accountOverviewTitle'),
    balance: t('currentBalance'),
    files: t('myFiles'),
    notes: t('notesTitle')
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* Cleaner, purposeful header replacing the old overloaded block */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border/50 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary/80">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {t('dashboardTitle')}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            {t('dashboardGreeting', { name: data?.userName || '' })}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground/90">
            {t('dashboardSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <Button
            asChild
            variant="outline"
            className="h-9 px-4 rounded-lg text-xs font-semibold shadow-sm hover:bg-primary/5 hover:border-primary/30 transition-colors"
          >
            <Link href="/my/sessions">{t('openSessions')}</Link>
          </Button>
          <Button asChild className="h-9 px-4 rounded-lg text-xs font-semibold shadow-md">
            <Link href="/my/surveys">{t('openSurveys')}</Link>
          </Button>
        </div>
      </div>

      <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
        <DashboardGrid
          initialLayout={data?.dashboardConfig}
          onSave={saveClientDashboardConfig}
          defaultLayout={DEFAULT_LAYOUT}
          availableWidgets={AVAILABLE_WIDGETS}
          widgetLabels={widgetLabels}
          data={data}
        />
      </div>
    </div>
  );
}
