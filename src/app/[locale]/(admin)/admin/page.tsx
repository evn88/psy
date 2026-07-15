'use client';

import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { getAdminDashboardStats, saveDashboardConfig } from '@/app/api/actions/dashboard-actions';
import { DashboardGrid, WidgetConfig } from '@/components/dashboard/dashboard-grid';
import {
  UsersWaitingWidget,
  UpcomingSlotsWidget,
  ScheduledHoursWidget,
  FreeHoursWidget,
  PaymentsChartWidget,
  MonthlyPaymentsWidget,
  BookedUsersWidget,
  CancelledStatsWidget,
  TotalUsersWidget,
  OnlineNowWidget,
  QuickActionsWidget,
  WorkflowBudgetWidget,
  SentNotificationsWidget,
  AdminNotesWidget
} from './_components/admin-widgets';

const AVAILABLE_WIDGETS = {
  usersWaiting: UsersWaitingWidget,
  upcomingSlots: UpcomingSlotsWidget,
  scheduledHours: ScheduledHoursWidget,
  freeHours: FreeHoursWidget,
  paymentsChart: PaymentsChartWidget,
  monthlyPayments: MonthlyPaymentsWidget,
  bookedUsers: BookedUsersWidget,
  cancelledStats: CancelledStatsWidget,
  totalUsers: TotalUsersWidget,
  onlineNow: OnlineNowWidget,
  quickActions: QuickActionsWidget,
  workflowBudget: WorkflowBudgetWidget,
  sentNotifications: SentNotificationsWidget,
  notes: AdminNotesWidget
};

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: '1', type: 'usersWaiting' },
  { id: '2', type: 'upcomingSlots' },
  { id: '3', type: 'scheduledHours' },
  { id: '4', type: 'freeHours' },
  { id: '5', type: 'paymentsChart' },
  { id: '6', type: 'quickActions' },
  { id: '7', type: 'monthlyPayments' },
  { id: '8', type: 'bookedUsers' },
  { id: '9', type: 'cancelledStats' },
  { id: '10', type: 'totalUsers' },
  { id: '11', type: 'onlineNow' },
  { id: '12', type: 'workflowBudget' },
  { id: '13', type: 'sentNotifications' },
  { id: '14', type: 'notes' }
];

export default function AdminDashboardPage() {
  const t = useTranslations('Admin');
  const { data, isLoading } = useSWR('adminDashboardStats', () => getAdminDashboardStats());

  const widgetLabels = {
    usersWaiting: t('usersWaitingTitle'),
    upcomingSlots: t('upcomingSlotsTitle'),
    scheduledHours: t('scheduledHoursTitle'),
    freeHours: t('freeHoursTitle'),
    paymentsChart: t('paymentsChartTitle'),
    monthlyPayments: t('monthlyPaymentsTitle'),
    bookedUsers: t('bookedUsersTitle'),
    cancelledStats: t('cancelledStatsTitle'),
    totalUsers: t('totalUsers'),
    onlineNow: t('onlineNow'),
    quickActions: t('quickActionsTitle'),
    workflowBudget: t('workflowRemainingStepsTitle'),
    sentNotifications: t('workflowSentNotificationsTitle'),
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
