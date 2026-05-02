import { type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { createPaddedNumberRange, formatTimeParts, parseTimeParts } from './form-field-utils';

const HOUR_OPTIONS = createPaddedNumberRange({ start: 0, end: 23 });
const MINUTE_OPTIONS = createPaddedNumberRange({ start: 0, end: 59 });

/**
 * Рисует мобильное поле времени без нативного iOS-инпута.
 * @param props - control, имя поля и подпись.
 * @returns Поле времени на базе двух селектов.
 */
export const TimeField = <TFieldValues extends FieldValues>({
  control,
  label,
  name
}: {
  control: Control<TFieldValues>;
  label: string;
  name: Path<TFieldValues>;
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const timeParts = parseTimeParts(field.value as string | null | undefined);

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={timeParts.hour || undefined}
                  onValueChange={hour => {
                    field.onChange(formatTimeParts({ hour, minute: timeParts.minute }) ?? '');
                  }}
                >
                  <SelectTrigger className="h-11 rounded-2xl bg-white/70 text-base dark:bg-white/5">
                    <SelectValue placeholder="HH" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {HOUR_OPTIONS.map(hour => (
                      <SelectItem key={hour} value={hour} className="rounded-xl">
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={timeParts.minute || undefined}
                  onValueChange={minute => {
                    field.onChange(formatTimeParts({ hour: timeParts.hour, minute }) ?? '');
                  }}
                >
                  <SelectTrigger className="h-11 rounded-2xl bg-white/70 text-base dark:bg-white/5">
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {MINUTE_OPTIONS.map(minute => (
                      <SelectItem key={minute} value={minute} className="rounded-xl">
                        {minute}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
