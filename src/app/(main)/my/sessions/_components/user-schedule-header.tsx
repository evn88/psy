'use client';

import { format } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { enUS, ru } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserScheduleHeaderProps {
  selectedDate: Date;
  viewMode: 'day' | 'week';
  onViewModeChange: (mode: 'day' | 'week') => void;
}

export function UserScheduleHeader({
  selectedDate,
  viewMode,
  onViewModeChange
}: UserScheduleHeaderProps) {
  const t = useTranslations('My');
  const locale = useLocale();
  const dateLocale = locale === 'ru' ? ru : enUS;

  return (
    <CardHeader className="pb-3 px-4 sm:px-6">
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-xl">
            {format(selectedDate, viewMode === 'day' ? 'd MMMM, EEEE' : 'wo MMMM, yyyy', {
              locale: dateLocale
            })}
          </CardTitle>
          <CardDescription className="mt-1 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {viewMode === 'day' ? t('daySchedule') : t('weekSchedule')}
          </CardDescription>
        </div>

        <Tabs
          value={viewMode}
          onValueChange={v => onViewModeChange(v as 'day' | 'week')}
          className="hidden sm:block"
        >
          <TabsList className="grid w-[120px] grid-cols-2 h-8">
            <TabsTrigger value="day" className="text-xs">
              {t('dayTab')}
            </TabsTrigger>
            <TabsTrigger value="week" className="text-xs">
              {t('weekTab')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="sm:hidden mt-4">
        <Tabs value={viewMode} onValueChange={v => onViewModeChange(v as 'day' | 'week')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="day">{t('dayTab')}</TabsTrigger>
            <TabsTrigger value="week">{t('weekTab')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </CardHeader>
  );
}
