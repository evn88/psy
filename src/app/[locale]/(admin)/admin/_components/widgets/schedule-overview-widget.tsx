'use client';

import { useTranslations } from 'next-intl';
import { CalendarCheck, Clock, UserCheck, CalendarClock, ChevronRight } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { DashboardWidget, DashboardWidgetHeader } from '@/components/dashboard/dashboard-widget';

export const ScheduleOverviewWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');

  const scheduledHours =
    data?.scheduledHoursThisWeek !== undefined
      ? Math.round(data.scheduledHoursThisWeek * 10) / 10
      : '-';
  const freeHours = data?.freeHours !== undefined ? Math.round(data.freeHours * 10) / 10 : '-';

  const metrics = [
    {
      title: t('scheduledHoursTitle'),
      value: scheduledHours,
      desc: t('scheduledHoursDesc'),
      icon: Clock,
      colorClass: 'bg-primary/10 text-primary'
    },
    {
      title: t('usersWaitingTitle'),
      value: data?.waitingUsersCount ?? '-',
      desc: t('usersWaitingDesc'),
      icon: UserCheck,
      colorClass: 'bg-accent/10 text-accent-foreground'
    },
    {
      title: t('upcomingSlotsTitle'),
      value: data?.upcomingSlotsCount ?? '-',
      desc: t('upcomingSlotsDesc'),
      icon: CalendarCheck,
      colorClass: 'bg-primary/10 text-primary'
    },
    {
      title: t('freeHoursTitle'),
      value: freeHours,
      desc: t('freeHoursDesc'),
      icon: CalendarClock,
      colorClass: 'bg-muted text-muted-foreground'
    }
  ];

  return (
    <DashboardWidget>
      <DashboardWidgetHeader
        title={t('scheduleOverviewTitle')}
        icon={CalendarCheck}
        action={
          !isEditing ? (
            <Link
              href="/admin/schedule"
              className="flex min-h-11 items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Подробнее
              <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          ) : null
        }
      />
      <CardContent className="flex-1 p-0">
        <div className="grid h-full grid-cols-2 divide-x divide-y divide-border/50">
          {metrics.map(metric => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.title}
                className={cn(
                  'flex min-h-32 flex-col justify-center p-4 sm:p-5',
                  !isEditing && 'transition-colors duration-200 hover:bg-muted/20'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn('rounded-lg p-2', metric.colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="truncate text-xs font-medium text-muted-foreground">
                    {metric.title}
                  </span>
                </div>
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                  {metric.value}
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{metric.desc}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </DashboardWidget>
  );
};

ScheduleOverviewWidget.defaultClassName = 'sm:col-span-2 lg:col-span-3 row-span-2';
