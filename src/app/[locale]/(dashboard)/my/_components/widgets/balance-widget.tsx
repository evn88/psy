'use client';

import { useTranslations } from 'next-intl';
import { CreditCard } from 'lucide-react';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { MyStatCard } from './my-stat-card';

export const BalanceWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');
  return (
    <MyStatCard
      title={t('currentBalance')}
      value={data?.balance != null ? new Intl.NumberFormat().format(data.balance) : '-'}
      description={t('balanceDesc')}
      icon={CreditCard}
      tone={data?.balance > 0 ? 'accent' : 'default'}
      href="/my/payments"
      isEditing={isEditing}
    />
  );
};
