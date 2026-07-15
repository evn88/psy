'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Activity,
  Ban,
  BellRing,
  CalendarCheck,
  CalendarClock,
  Clock,
  CreditCard,
  Gauge,
  Send,
  Settings,
  UserCheck,
  Users
} from 'lucide-react';
import { formatPaymentAmount } from '@/modules/payments';
import { AdminPaymentsLineChart } from './admin-payments-line-chart';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote } from 'lucide-react';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'accent' | 'warning';
  href?: string;
  isEditing?: boolean;
}

const AdminStatCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = 'default',
  href,
  isEditing
}: AdminStatCardProps) => {
  const iconClassName =
    tone === 'accent'
      ? 'bg-primary text-primary-foreground shadow-inner'
      : tone === 'warning'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-muted text-muted-foreground';

  const CardWrapper = href && !isEditing ? Link : 'div';

  return (
    <CardWrapper
      href={href || '#'}
      className={cn(
        'block h-full transition-all duration-300',
        !isEditing && href && 'hover:-translate-y-1 hover:shadow-md group',
        isEditing && 'cursor-default'
      )}
    >
      <Card className="h-full shadow-sm transition-colors group-hover:border-primary/40">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            {title}
          </CardTitle>
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl transition-transform',
              iconClassName,
              !isEditing && href && 'group-hover:scale-110'
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </CardWrapper>
  );
};

// --- WIDGETS ---

export const UsersWaitingWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  return (
    <AdminStatCard
      title={t('usersWaitingTitle')}
      value={data?.waitingUsersCount ?? '-'}
      description={t('usersWaitingDesc')}
      icon={UserCheck}
      tone="accent"
      href="/admin/schedule"
      isEditing={isEditing}
    />
  );
};

export const UpcomingSlotsWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  return (
    <AdminStatCard
      title={t('upcomingSlotsTitle')}
      value={data?.upcomingSlotsCount ?? '-'}
      description={t('upcomingSlotsDesc')}
      icon={CalendarCheck}
      href="/admin/schedule"
      isEditing={isEditing}
    />
  );
};

export const ScheduledHoursWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  const value = data ? Math.round(data.scheduledHoursThisWeek * 10) / 10 : '-';
  return (
    <AdminStatCard
      title={t('scheduledHoursTitle')}
      value={value}
      description={t('scheduledHoursDesc')}
      icon={Clock}
      href="/admin/schedule"
      isEditing={isEditing}
    />
  );
};

export const FreeHoursWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  const value = data ? Math.round(data.freeHours * 10) / 10 : '-';
  return (
    <AdminStatCard
      title={t('freeHoursTitle')}
      value={value}
      description={t('freeHoursDesc')}
      icon={CalendarClock}
      href="/admin/schedule"
      isEditing={isEditing}
    />
  );
};

export const PaymentsChartWidget: WidgetComponentType = ({ data, isEditing, isOverlay }) => {
  const t = useTranslations('Admin');
  if (!data)
    return (
      <Card className="h-[300px] flex items-center justify-center">
        <Activity className="animate-spin text-muted-foreground" />
      </Card>
    );

  const CardWrapper = !isEditing ? Link : 'div';

  return (
    <CardWrapper
      href="/admin/payments"
      className={cn(
        'block h-full transition-all duration-300',
        !isEditing && 'hover:-translate-y-1 hover:shadow-md group'
      )}
    >
      <Card className="shadow-sm h-full flex flex-col group-hover:border-primary/40 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
            {t('paymentsChartTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pointer-events-none">
          {isOverlay ? (
            <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-muted/10 rounded-lg border border-dashed border-border/50 text-muted-foreground/60">
              <Activity className="w-8 h-8" />
            </div>
          ) : (
            <AdminPaymentsLineChart
              currency={data.paymentsCurrency}
              data={data.paymentsYearlySeries}
            />
          )}
        </CardContent>
      </Card>
    </CardWrapper>
  );
};
PaymentsChartWidget.defaultClassName = 'sm:col-span-2 xl:col-span-2 row-span-2';

export const MonthlyPaymentsWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  const value = data
    ? formatPaymentAmount(data.currentMonthPaymentsTotal, data.paymentsCurrency)
    : '-';
  return (
    <AdminStatCard
      title={t('monthlyPaymentsTitle')}
      value={value}
      description={t('monthlyPaymentsDesc')}
      icon={CreditCard}
      tone="accent"
      href="/admin/payments"
      isEditing={isEditing}
    />
  );
};

export const BookedUsersWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  return (
    <AdminStatCard
      title={t('bookedUsersTitle')}
      value={data?.bookedUsersCount ?? '-'}
      description={t('bookedUsersDesc')}
      icon={Users}
      href="/admin/clients"
      isEditing={isEditing}
    />
  );
};

export const CancelledStatsWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  return (
    <AdminStatCard
      title={t('cancelledStatsTitle')}
      value={data?.cancelledEventsCount ?? '-'}
      description={t('cancelledStatsDesc')}
      icon={Ban}
      tone="warning"
      href="/admin/schedule"
      isEditing={isEditing}
    />
  );
};

export const TotalUsersWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  return (
    <AdminStatCard
      title={t('totalUsers')}
      value={data?.userCount ?? '-'}
      description={t('registeredUsers')}
      icon={Users}
      href="/admin/users"
      isEditing={isEditing}
    />
  );
};

export const OnlineNowWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  return (
    <AdminStatCard
      title={t('onlineNow')}
      value={data?.activeSessionsCount ?? '-'}
      description={t('activeSessions')}
      icon={Activity}
      href="/admin/users"
      isEditing={isEditing}
    />
  );
};

export const QuickActionsWidget: WidgetComponentType = ({ isEditing }) => {
  const t = useTranslations('Admin');
  return (
    <Card className="shadow-sm h-full">
      <CardHeader>
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
          {t('quickActionsTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button
          asChild
          variant="outline"
          className="h-auto w-full justify-start p-2.5 hover:bg-primary/5 hover:border-primary/30 transition-colors pointer-events-auto"
          disabled={isEditing}
        >
          <Link href="/admin/users" className="flex items-center gap-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="text-left">
              <div className="text-sm font-semibold">{t('quickActionUsers')}</div>
            </div>
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-auto w-full justify-start p-2.5 hover:bg-primary/5 hover:border-primary/30 transition-colors pointer-events-auto"
          disabled={isEditing}
        >
          <Link href="/admin/schedule" className="flex items-center gap-3">
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            <div className="text-left">
              <div className="text-sm font-semibold">{t('quickActionSchedule')}</div>
            </div>
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-auto w-full justify-start p-2.5 hover:bg-primary/5 hover:border-primary/30 transition-colors pointer-events-auto"
          disabled={isEditing}
        >
          <Link href="/admin/send-email" className="flex items-center gap-3">
            <Send className="h-4 w-4 text-muted-foreground" />
            <div className="text-left">
              <div className="text-sm font-semibold">{t('quickActionEmail')}</div>
            </div>
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-auto w-full justify-start p-2.5 hover:bg-primary/5 hover:border-primary/30 transition-colors pointer-events-auto"
          disabled={isEditing}
        >
          <Link href="/admin/settings" className="flex items-center gap-3">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <div className="text-left">
              <div className="text-sm font-semibold">{t('quickActionSettings')}</div>
            </div>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
QuickActionsWidget.defaultClassName = 'row-span-2';

export const WorkflowBudgetWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  const numberFormatter = new Intl.NumberFormat();
  const snapshot = data?.workflowBudgetSnapshot;

  const CardWrapper = !isEditing ? Link : 'div';

  return (
    <CardWrapper
      href="/admin/settings"
      className={cn(
        'block h-full transition-all duration-300',
        !isEditing && 'hover:-translate-y-1 hover:shadow-md group'
      )}
    >
      <Card className="shadow-sm h-full group-hover:border-primary/40 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            {t('workflowRemainingStepsTitle')}
          </CardTitle>
          <Gauge
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              !isEditing && 'group-hover:scale-110'
            )}
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            {snapshot ? numberFormatter.format(snapshot.remainingSteps) : '-'}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {snapshot
              ? t('workflowRemainingStepsDesc', {
                  period: snapshot.periodKey,
                  used: numberFormatter.format(snapshot.estimatedSteps),
                  limit: numberFormatter.format(snapshot.monthlyStepLimit)
                })
              : '-'}
          </p>
        </CardContent>
      </Card>
    </CardWrapper>
  );
};

export const SentNotificationsWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  const numberFormatter = new Intl.NumberFormat();
  const snapshot = data?.workflowBudgetSnapshot;

  const CardWrapper = !isEditing ? Link : 'div';

  return (
    <CardWrapper
      href="/admin/logs"
      className={cn(
        'block h-full transition-all duration-300',
        !isEditing && 'hover:-translate-y-1 hover:shadow-md group'
      )}
    >
      <Card className="shadow-sm h-full group-hover:border-primary/40 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            {t('workflowSentNotificationsTitle')}
          </CardTitle>
          <BellRing
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              !isEditing && 'group-hover:scale-110'
            )}
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            {snapshot ? numberFormatter.format(snapshot.totalSentNotifications) : '-'}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {snapshot
              ? t('workflowSentNotificationsDesc', {
                  email: numberFormatter.format(snapshot.reminderEmailCount),
                  push: numberFormatter.format(snapshot.reminderPushCount),
                  alerts: numberFormatter.format(snapshot.adminAlertEmailSentCount)
                })
              : '-'}
          </p>
        </CardContent>
      </Card>
    </CardWrapper>
  );
};

export const AdminNotesWidget: WidgetComponentType = ({ isEditing }) => {
  const t = useTranslations('Admin');
  const [note, setNote] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    const saved = localStorage.getItem('admin_dashboard_notes');
    if (saved) setNote(saved);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    localStorage.setItem('admin_dashboard_notes', e.target.value);
  };

  return (
    <Card
      className={cn(
        'border border-border/50 shadow-sm rounded-xl overflow-hidden h-full flex flex-col transition-all duration-300',
        !isEditing && 'pointer-events-auto'
      )}
    >
      <CardHeader className="border-b bg-muted/5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            {t('notesTitle')}
          </CardTitle>
          <StickyNote className="h-4 w-4 text-muted-foreground/60" />
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col relative">
        {isMounted ? (
          <Textarea
            value={note}
            onChange={handleChange}
            disabled={isEditing}
            placeholder={t('notesPlaceholder')}
            className="flex-1 w-full h-full min-h-[150px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-transparent p-4 text-sm leading-relaxed"
          />
        ) : (
          <div className="flex-1 w-full min-h-[150px]" />
        )}
      </CardContent>
    </Card>
  );
};
AdminNotesWidget.defaultClassName = 'row-span-2 sm:col-span-2 lg:col-span-1';
