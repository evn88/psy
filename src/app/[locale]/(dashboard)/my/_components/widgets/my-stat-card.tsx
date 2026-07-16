'use client';

import type { ComponentType } from 'react';

import { DashboardStatWidget } from '@/components/dashboard/dashboard-widget';

interface MyStatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone?: 'default' | 'accent';
  href?: string;
  isEditing?: boolean;
}

export const MyStatCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = 'default',
  href,
  isEditing
}: MyStatCardProps) => {
  return (
    <DashboardStatWidget
      title={title}
      value={value}
      description={description}
      icon={Icon}
      tone={tone}
      href={href}
      isEditing={isEditing}
    />
  );
};
