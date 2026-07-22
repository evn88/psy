'use client';

import { useTranslations } from 'next-intl';
import { CalendarDays } from 'lucide-react';
import { enUS, ru } from 'date-fns/locale';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { MyStatCard } from './my-stat-card';
import { useScheduleDateTime } from '@/lib/hooks/use-schedule-date-time';

export const NextSessionWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');
  const userLocale = data?.userLanguage === 'en' ? enUS : ru;
  const dateTime = useScheduleDateTime(data?.userTimezone || 'UTC');

  let formattedNextSession = '—';
  let description = t('nextSessionDesc');

  if (data?.nextSessionStart) {
    const start = new Date(data.nextSessionStart);
    formattedNextSession = dateTime.format(start, 'shortDateTime', userLocale);
    description =
      data.nextSessionTitle ||
      (data.userLanguage === 'ru' ? 'Консультация запланирована' : 'Consultation scheduled');
  }

  return (
    <MyStatCard
      title={t('nextSession')}
      value={formattedNextSession}
      description={description}
      icon={CalendarDays}
      tone={data?.nextSessionStart ? 'accent' : 'default'}
      href="/my/sessions"
      isEditing={isEditing}
    />
  );
};
