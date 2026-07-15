'use client';

import { useTranslations } from 'next-intl';
import { Users, Ban, Activity } from 'lucide-react';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { AdminStatCard } from './admin-stat-card';

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
