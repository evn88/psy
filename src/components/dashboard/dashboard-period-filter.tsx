'use client';

import { useState, useSyncExternalStore } from 'react';
import { format } from 'date-fns';
import { enUS, ru, srLatn } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  getCustomDashboardPeriod,
  getDashboardPeriod,
  type DashboardPeriod,
  type DashboardPeriodPreset
} from '@/lib/dashboard-period';

const PRESETS = [
  'today',
  'week',
  'previousWeek',
  'month',
  'previousMonth',
  'last30Days',
  'threeMonths',
  'sixMonths',
  'year'
] as const;
const subscribeToTimeZone = () => () => undefined;

interface DashboardPeriodFilterProps {
  onChange: (period: DashboardPeriod) => void;
}

const toDateRange = (period: DashboardPeriod): DateRange => ({
  from: new Date(period.from),
  to: new Date(period.to)
});

export const DashboardPeriodFilter = ({ onChange }: DashboardPeriodFilterProps) => {
  const t = useTranslations('DashboardPeriod');
  const localeCode = useLocale();
  const locale = localeCode === 'en' ? enUS : localeCode === 'sr' ? srLatn : ru;
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<DashboardPeriodPreset>('week');
  const [selectedRange, setSelectedRange] = useState<DateRange>(() =>
    toDateRange(getDashboardPeriod('week'))
  );
  const timeZone = useSyncExternalStore(
    subscribeToTimeZone,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => undefined
  );

  const applyPreset = (nextPreset: Exclude<DashboardPeriodPreset, 'custom'>) => {
    const period = getDashboardPeriod(nextPreset);
    setPreset(nextPreset);
    setSelectedRange(toDateRange(period));
    onChange(period);
    setOpen(false);
  };

  const applyCustomPeriod = () => {
    if (!selectedRange.from || !selectedRange.to) return;

    onChange(getCustomDashboardPeriod(selectedRange.from, selectedRange.to));
    setOpen(false);
  };

  const label =
    selectedRange.from && selectedRange.to
      ? `${format(selectedRange.from, 'd MMM yyyy', { locale })} – ${format(selectedRange.to, 'd MMM yyyy', { locale })}`
      : t('custom');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-10 min-w-56 justify-start shadow-none">
          <CalendarDays data-icon="inline-start" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0">
        <div className="flex flex-col md:flex-row">
          <div className="flex min-w-48 flex-row gap-1 overflow-x-auto p-3 md:max-h-[28rem] md:flex-col md:overflow-y-auto">
            {PRESETS.map(item => (
              <Button
                key={item}
                type="button"
                variant={preset === item ? 'secondary' : 'ghost'}
                size="sm"
                className="shrink-0 justify-start shadow-none"
                onClick={() => applyPreset(item)}
              >
                {t(item)}
              </Button>
            ))}
            <Button
              type="button"
              variant={preset === 'custom' ? 'secondary' : 'ghost'}
              size="sm"
              className="shrink-0 justify-start shadow-none"
              onClick={() => setPreset('custom')}
            >
              {t('custom')}
            </Button>
          </div>
          <Separator orientation="vertical" className="hidden h-auto md:block" />
          <Separator className="md:hidden" />
          <div className="p-2">
            <Calendar
              mode="range"
              selected={selectedRange}
              onSelect={range => {
                setPreset('custom');
                setSelectedRange(range ?? { from: undefined, to: undefined });
              }}
              numberOfMonths={2}
              defaultMonth={selectedRange.from}
              locale={locale}
              timeZone={timeZone}
              className="[--cell-size:2.5rem]"
            />
            <div className="flex items-center justify-between gap-3 border-t border-border/50 px-3 py-2">
              <span
                className={cn('text-xs text-muted-foreground', preset !== 'custom' && 'invisible')}
              >
                {t('customHint')}
              </span>
              <Button
                type="button"
                size="sm"
                disabled={!selectedRange.from || !selectedRange.to}
                onClick={applyCustomPeriod}
              >
                {t('apply')}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
