'use client';

import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { getAdminDashboardStats, saveDashboardConfig } from '@/app/api/actions/dashboard-actions';
import { DashboardGrid, WidgetConfig } from '@/components/dashboard/dashboard-grid';
import {
  ScheduleOverviewWidget,
  PaymentsOverviewWidget,
  BookedUsersWidget,
  CancelledStatsWidget,
  TotalUsersWidget,
  OnlineNowWidget,
  NewUsersWidget,
  QuickActionsWidget,
  WorkflowBudgetWidget,
  SentNotificationsWidget,
  SystemErrorsWidget,
  CompletedSurveysAdminWidget,
  AdminNotesWidget
} from './_components/widgets';

const AVAILABLE_WIDGETS = {
  scheduleOverview: ScheduleOverviewWidget,
  paymentsOverview: PaymentsOverviewWidget,
  bookedUsers: BookedUsersWidget,
  cancelledStats: CancelledStatsWidget,
  totalUsers: TotalUsersWidget,
  onlineNow: OnlineNowWidget,
  newUsers: NewUsersWidget,
  quickActions: QuickActionsWidget,
  workflowBudget: WorkflowBudgetWidget,
  sentNotifications: SentNotificationsWidget,
  systemErrors: SystemErrorsWidget,
  completedSurveysAdmin: CompletedSurveysAdminWidget,
  notes: AdminNotesWidget
};

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: '1', type: 'scheduleOverview' },
  { id: '2', type: 'paymentsOverview' },
  { id: '3', type: 'systemErrors' },
  { id: '4', type: 'quickActions' },
  { id: '5', type: 'newUsers' },
  { id: '6', type: 'completedSurveysAdmin' },
  { id: '7', type: 'totalUsers' },
  { id: '8', type: 'onlineNow' },
  { id: '9', type: 'bookedUsers' },
  { id: '10', type: 'cancelledStats' },
  { id: '11', type: 'workflowBudget' },
  { id: '12', type: 'sentNotifications' },
  { id: '13', type: 'notes' }
];

export default function AdminDashboardPage() {
  const t = useTranslations('Admin');
  const { data, isLoading } = useSWR('adminDashboardStats', () => getAdminDashboardStats());

  const widgetLabels = {
    scheduleOverview: t('scheduleOverviewTitle'),
    paymentsOverview: t('paymentsOverviewTitle'),
    bookedUsers: t('bookedUsersTitle'),
    cancelledStats: t('cancelledStatsTitle'),
    totalUsers: t('totalUsers'),
    onlineNow: t('onlineNow'),
    newUsers: t('newUsersTitle'),
    quickActions: t('quickActionsTitle'),
    workflowBudget: t('workflowRemainingStepsTitle'),
    sentNotifications: t('workflowSentNotificationsTitle'),
    systemErrors: t('systemErrorsTitle'),
    completedSurveysAdmin: t('completedSurveysAdminTitle'),
    notes: t('notesTitle')
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-border/50 pb-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            {t('dashboardTitle')}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground/80">
            {t('dashboardSubtitle')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto shadow-sm hover:bg-primary/5 hover:border-primary/30 transition-colors"
          >
            <Link href="/admin/schedule">{t('openSchedule')}</Link>
          </Button>
          <Button asChild className="w-full sm:w-auto shadow-md">
            <Link href="/admin/users">{t('manageUsers')}</Link>
          </Button>
        </div>
      </div>

      <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
        <DashboardGrid
          storageKey="admin_dashboard_layout"
          defaultLayout={DEFAULT_LAYOUT}
          availableWidgets={AVAILABLE_WIDGETS}
          widgetLabels={widgetLabels}
          data={data}
        />
      </div>
    </div>
  );
}
