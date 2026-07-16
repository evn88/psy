'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import {
  getClientDashboardStats,
  saveClientDashboardConfig
} from '@/app/api/actions/dashboard-actions';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { DashboardPeriodFilter } from '@/components/dashboard/dashboard-period-filter';
import type { WidgetConfig } from '@/lib/dashboard-config';
import { getDashboardPeriod, type DashboardPeriod } from '@/lib/dashboard-period';
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
  const [period, setPeriod] = useState<DashboardPeriod>(() => getDashboardPeriod('week'));
  const { data, isLoading } = useSWR(['clientDashboardStats', period], () =>
    getClientDashboardStats(period)
  );

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
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-12 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {data?.userName
            ? t('dashboardGreeting', { name: data.userName })
            : t('dashboardFallbackTitle')}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {t('dashboardSubtitle')}
        </p>
      </header>

      <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
        <DashboardGrid
          toolbarStart={<DashboardPeriodFilter onChange={setPeriod} />}
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
