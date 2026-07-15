'use client';

import { useTranslations } from 'next-intl';
import { ClipboardList } from 'lucide-react';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { MyStatCard } from './my-stat-card';

export const PendingSurveysWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');
  return (
    <MyStatCard
      title={t('pendingSurveys')}
      value={data?.pendingSurveys ?? '-'}
      description={t('pendingSurveysDesc')}
      icon={ClipboardList}
      tone={(data?.pendingSurveys ?? 0) > 0 ? 'accent' : 'default'}
      href="/my/surveys"
      isEditing={isEditing}
    />
  );
};
