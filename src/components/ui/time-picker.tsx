'use client';

import * as React from 'react';
import { Clock3 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { mergeTimePickerValue, parseTimePickerValue } from '@/lib/date-time-picker';
import { cn } from '@/lib/utils';

const createPaddedRange = (end: number): string[] =>
  Array.from({ length: end + 1 }, (_, index) => String(index).padStart(2, '0'));

const HOUR_OPTIONS = createPaddedRange(23);
const MINUTE_OPTIONS = createPaddedRange(59);

export interface TimePickerProps {
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
 * Отображает единое поле времени с доступным выбором часов и минут.
 * Значение компонента хранится в 24-часовом формате `HH:mm`.
 */
export const TimePicker = React.forwardRef<HTMLButtonElement, TimePickerProps>(
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
    const [open, setOpen] = React.useState(false);
    const hourSelectId = React.useId();
    const minuteSelectId = React.useId();
    const { hour, minute, isValid: hasValidTime } = parseTimePickerValue(value);

    const updateTime = (next: { hour?: string; minute?: string }) => {
      onChange(mergeTimePickerValue(value, next));
    };

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
            data-empty={!hasValidTime}
            className={cn(
              'w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground',
              className
            )}
          >
            <Clock3 data-icon="inline-start" />
            <span>{hasValidTime ? `${hour}:${minute}` : placeholder || t('selectTime')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={hourSelectId}>{t('hours')}</Label>
              <Select
                value={hour || undefined}
                onValueChange={nextHour => updateTime({ hour: nextHour })}
              >
                <SelectTrigger id={hourSelectId}>
                  <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectGroup>
                    {HOUR_OPTIONS.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={minuteSelectId}>{t('minutes')}</Label>
              <Select
                value={minute || undefined}
                onValueChange={nextMinute => updateTime({ minute: nextMinute })}
              >
                <SelectTrigger id={minuteSelectId}>
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectGroup>
                    {MINUTE_OPTIONS.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            type="button"
            className="mt-4 w-full"
            onClick={() => {
              setOpen(false);
              onBlur?.();
            }}
          >
            {t('done')}
          </Button>
        </PopoverContent>
      </Popover>
    );
  }
);
TimePicker.displayName = 'TimePicker';
