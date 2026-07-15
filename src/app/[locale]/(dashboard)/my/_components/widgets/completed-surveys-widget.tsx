'use client';

import { useTranslations } from 'next-intl';
import { Activity } from 'lucide-react';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { MyStatCard } from './my-stat-card';

export const CompletedSurveysWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');
  return (
    <MyStatCard
      title={t('completedSurveys')}
      value={data?.completedSurveys ?? '-'}
      description={t('completedSurveysDesc')}
      icon={Activity}
      href="/my/surveys"
      isEditing={isEditing}
    />
  );
};
