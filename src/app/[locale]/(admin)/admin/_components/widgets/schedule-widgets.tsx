'use client';

import { useTranslations } from 'next-intl';
import { CalendarCheck, Clock, CalendarClock } from 'lucide-react';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { AdminStatCard } from './admin-stat-card';

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
