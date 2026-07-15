'use client';

import { useTranslations } from 'next-intl';
import {
  Users,
  CalendarCheck,
  Send,
  Settings,
  Gauge,
  BellRing,
  Bug,
  ClipboardList
} from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { AdminStatCard } from './admin-stat-card';
import {
  DashboardStatWidget,
  DashboardWidget,
  DashboardWidgetHeader
} from '@/components/dashboard/dashboard-widget';
import type { ComponentType } from 'react';

interface QuickActionLinkProps {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isEditing?: boolean;
}

const QuickActionLink = ({ href, label, icon: Icon, isEditing }: QuickActionLinkProps) => (
  <Link
    href={href}
    aria-disabled={isEditing}
    tabIndex={isEditing ? -1 : undefined}
    className={cn(
      'flex min-h-11 items-center gap-3 rounded-lg border border-border/60 px-3.5 py-2.5 text-sm font-medium transition-[border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      !isEditing && 'hover:border-primary/30 hover:bg-muted/30',
      isEditing && 'pointer-events-none opacity-60'
    )}
  >
    <Icon className="size-4 text-muted-foreground" />
    {label}
  </Link>
);

export const QuickActionsWidget: WidgetComponentType = ({ isEditing }) => {
  const t = useTranslations('Admin');
  return (
    <DashboardWidget>
      <DashboardWidgetHeader title={t('quickActionsTitle')} />
      <CardContent className="grid flex-1 content-start gap-2 p-4">
        <QuickActionLink
          href="/admin/users"
          label={t('quickActionUsers')}
          icon={Users}
          isEditing={isEditing}
        />
        <QuickActionLink
          href="/admin/schedule"
          label={t('quickActionSchedule')}
          icon={CalendarCheck}
          isEditing={isEditing}
        />
        <QuickActionLink
          href="/admin/send-email"
          label={t('quickActionEmail')}
          icon={Send}
          isEditing={isEditing}
        />
        <QuickActionLink
          href="/admin/settings"
          label={t('quickActionSettings')}
          icon={Settings}
          isEditing={isEditing}
        />
      </CardContent>
    </DashboardWidget>
  );
};
QuickActionsWidget.defaultClassName = 'row-span-2';

export const WorkflowBudgetWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  const numberFormatter = new Intl.NumberFormat();
  const snapshot = data?.workflowBudgetSnapshot;

  return (
    <DashboardStatWidget
      title={t('workflowRemainingStepsTitle')}
      value={snapshot ? numberFormatter.format(snapshot.remainingSteps) : '-'}
      description={
        snapshot
          ? t('workflowRemainingStepsDesc', {
              period: snapshot.periodKey,
              used: numberFormatter.format(snapshot.estimatedSteps),
              limit: numberFormatter.format(snapshot.monthlyStepLimit)
            })
          : '-'
      }
      icon={Gauge}
      href="/admin/settings"
      isEditing={isEditing}
    />
  );
};

export const SentNotificationsWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  const numberFormatter = new Intl.NumberFormat();
  const snapshot = data?.workflowBudgetSnapshot;

  return (
    <DashboardStatWidget
      title={t('workflowSentNotificationsTitle')}
      value={snapshot ? numberFormatter.format(snapshot.totalSentNotifications) : '-'}
      description={
        snapshot
          ? t('workflowSentNotificationsDesc', {
              email: numberFormatter.format(snapshot.reminderEmailCount),
              push: numberFormatter.format(snapshot.reminderPushCount),
              alerts: numberFormatter.format(snapshot.adminAlertEmailSentCount)
            })
          : '-'
      }
      icon={BellRing}
      href="/admin/logs"
      isEditing={isEditing}
    />
  );
};

export const SystemErrorsWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  const hasErrors = (data?.systemErrorsCount ?? 0) > 0;
  return (
    <AdminStatCard
      title={t('systemErrorsTitle')}
      value={data?.systemErrorsCount ?? '-'}
      description={t('systemErrorsDesc')}
      icon={Bug}
      tone={hasErrors ? 'warning' : 'default'}
      href="/admin/logs"
      isEditing={isEditing}
    />
  );
};

export const CompletedSurveysAdminWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  const count = data?.completedSurveysCount ?? 0;
  return (
    <AdminStatCard
      title={t('completedSurveysAdminTitle')}
      value={count}
      description={t('completedSurveysAdminDesc')}
      icon={ClipboardList}
      tone={count > 0 ? 'accent' : 'default'}
      href="/admin/surveys"
      isEditing={isEditing}
    />
  );
};
