'use client';

import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { MyStatCard } from './my-stat-card';

export const FilesWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');
  return (
    <MyStatCard
      title={t('myFiles')}
      value={data?.filesCount ?? '-'}
      description={t('filesDesc')}
      icon={FileText}
      href="/my/data"
      isEditing={isEditing}
    />
  );
};
