'use client';

import { useTranslations } from 'next-intl';
import { UserCheck } from 'lucide-react';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { AdminStatCard } from './admin-stat-card';

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
