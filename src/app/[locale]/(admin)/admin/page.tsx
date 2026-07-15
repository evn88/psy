'use client';

import React from 'react';
import useSWR from 'swr';

import { useTranslations } from 'next-intl';
import {
  getAdminDashboardStats,
  saveAdminDashboardConfig
} from '@/app/api/actions/dashboard-actions';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import type { WidgetConfig } from '@/lib/dashboard-config';
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
  { id: '4', type: 'quickActions' }
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
      <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
        <DashboardGrid
          initialLayout={data?.dashboardConfig}
          onSave={saveAdminDashboardConfig}
          defaultLayout={DEFAULT_LAYOUT}
          availableWidgets={AVAILABLE_WIDGETS}
          widgetLabels={widgetLabels}
          data={data}
        />
      </div>
    </div>
  );
}
