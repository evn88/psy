'use client';

import { useTranslations } from 'next-intl';
import { CalendarCheck, Clock, UserCheck, CalendarClock, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';

export const ScheduleOverviewWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');

  const scheduledHours = data ? Math.round(data.scheduledHoursThisWeek * 10) / 10 : '-';
  const freeHours = data ? Math.round(data.freeHours * 10) / 10 : '-';

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
    <Card className="shadow-sm h-full flex flex-col group overflow-hidden border border-border/50">
      <CardHeader className="border-b bg-muted/5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            {t('scheduleOverviewTitle')}
          </CardTitle>
          {!isEditing && (
            <Link
              href="/admin/schedule"
              className="flex items-center text-xs font-medium text-primary hover:underline"
            >
              Подробнее
              <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="grid grid-cols-2 divide-x divide-y divide-border/50 h-full">
          {metrics.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <div
                key={idx}
                className={cn(
                  'flex flex-col justify-center p-4 transition-colors',
                  !isEditing && 'hover:bg-primary/5'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn('p-1.5 rounded-md', metric.colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground truncate">
                    {metric.title}
                  </span>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {metric.value}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground/80 mt-1 truncate">
                  {metric.desc}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

ScheduleOverviewWidget.defaultClassName = 'sm:col-span-2 lg:col-span-3 row-span-2';
