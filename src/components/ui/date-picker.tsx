'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { AppLocale } from '@/i18n/config';
import { formatDatePickerValue, parseDatePickerValue } from '@/lib/date-time-picker';
import { getDateFnsLocale } from '@/lib/date-locale';
import { cn } from '@/lib/utils';

const subscribeToTimeZone = () => () => undefined;

export interface DatePickerProps {
  value?: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/**
 * Отображает локализованный выбор календарной даты без нативного браузерного picker.
 * Значение компонента хранится в стабильном формате `yyyy-MM-dd`.
 */
export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      onBlur,
      id,
      disabled,
      className,
      placeholder,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy
    },
    ref
  ) => {
    const t = useTranslations('DateTimePicker');
    const localeCode = useLocale() as AppLocale;
    const locale = getDateFnsLocale(localeCode);
    const [open, setOpen] = React.useState(false);
    const timeZone = React.useSyncExternalStore(
      subscribeToTimeZone,
      () => Intl.DateTimeFormat().resolvedOptions().timeZone,
      () => undefined
    );
    const selectedDate = parseDatePickerValue(value);
    const currentYear = new Date().getFullYear();

    return (
      <Popover
        modal
        open={open}
        onOpenChange={nextOpen => {
          setOpen(nextOpen);
          if (!nextOpen) {
            onBlur?.();
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            data-empty={!selectedDate}
            className={cn(
              'w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground',
              className
            )}
          >
            <CalendarDays data-icon="inline-start" />
            <span className="truncate">
              {selectedDate
                ? format(selectedDate, 'PPP', { locale })
                : placeholder || t('selectDate')}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            onSelect={date => {
              if (!date) {
                return;
              }

              onChange(formatDatePickerValue(date));
              setOpen(false);
              onBlur?.();
            }}
            captionLayout="dropdown"
            startMonth={new Date(currentYear - 5, 0)}
            endMonth={new Date(currentYear + 10, 11)}
            locale={locale}
            timeZone={timeZone}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    );
  }
);
DatePicker.displayName = 'DatePicker';
