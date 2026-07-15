'use client';

import { useTranslations } from 'next-intl';
import { Users, CalendarCheck, Send, Settings, Gauge, BellRing } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';

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
