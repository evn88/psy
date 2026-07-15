'use client';

import React from 'react';
import useSWR from 'swr';

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
