'use client';

import { useId, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { filterTimeZones, formatTimeZoneLabel, getSupportedTimeZones } from '@/lib/timezones';

interface TimezoneComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Поисковый выбор IANA-таймзоны с поддержкой клавиатуры.
 * @param props - текущее значение, обработчик изменения и состояние доступности.
 * @returns Комбобокс со строкой поиска и прокручиваемым списком результатов.
 */
export const TimezoneCombobox = ({
  value,
  onValueChange,
  disabled,
  id,
  className
}: TimezoneComboboxProps) => {
  const t = useTranslations('TimezonePicker');
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const timezones = useMemo(() => getSupportedTimeZones(), []);
  const filteredTimezones = useMemo(() => filterTimeZones(timezones, query), [query, timezones]);

  const selectTimezone = (timezone: string) => {
    onValueChange(timezone);
    setQuery('');
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={nextOpen => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery('');
          setActiveIndex(0);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          disabled={disabled}
          className={cn(
            'h-11 w-full justify-between rounded-xl border-border/60 bg-background px-3 font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{value ? formatTimeZoneLabel(value) : t('placeholder')}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            autoFocus
            type="search"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={event => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex(index =>
                  Math.min(index + 1, Math.max(filteredTimezones.length - 1, 0))
                );
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex(index => Math.max(index - 1, 0));
              } else if (event.key === 'Enter' && filteredTimezones[activeIndex]) {
                event.preventDefault();
                selectTimezone(filteredTimezones[activeIndex]);
              }
            }}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchLabel')}
            aria-controls={listboxId}
            aria-activedescendant={
              filteredTimezones[activeIndex]
                ? `${listboxId}-${filteredTimezones[activeIndex].replaceAll('/', '-')}`
                : undefined
            }
            className="h-10 pl-9"
          />
        </div>

        <div id={listboxId} role="listbox" className="mt-2 max-h-64 overflow-y-auto pr-1">
          {filteredTimezones.length > 0 ? (
            filteredTimezones.map((timezone, index) => (
              <button
                key={timezone}
                id={`${listboxId}-${timezone.replaceAll('/', '-')}`}
                type="button"
                role="option"
                aria-selected={timezone === value}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectTimezone(timezone)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent',
                  index === activeIndex && 'bg-accent'
                )}
              >
                <Check
                  className={cn('size-4 shrink-0', timezone !== value && 'invisible')}
                  aria-hidden
                />
                <span className="truncate">{formatTimeZoneLabel(timezone)}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
