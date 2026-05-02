import { type Control, type FieldValues, type Path } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  createPaddedNumberRange,
  formatDateParts,
  getDaysInMonth,
  normalizeDayForMonth,
  parseDateParts
} from './form-field-utils';

const MONTH_OPTIONS = createPaddedNumberRange({ start: 1, end: 12 });

/**
 * Возвращает компактный диапазон лет вокруг текущего года.
 * @param currentYear - текущий год.
 * @returns Годы для выбора в расписании.
 */
const getYearOptions = (currentYear: number) => {
  return Array.from({ length: 11 }, (_, index) => String(currentYear - 1 + index));
};

/**
 * Рисует мобильное поле даты без нативного iOS-инпута.
 * @param props - control, имя поля, подпись и опции nullable.
 * @returns Поле даты на базе трёх селектов.
 */
export const DateField = <TFieldValues extends FieldValues>({
  control,
  label,
  name,
  description,
  clearLabel,
  nullable = false
}: {
  control: Control<TFieldValues>;
  label: string;
  name: Path<TFieldValues>;
  description?: string;
  clearLabel?: string;
  nullable?: boolean;
}) => {
  const currentYear = new Date().getFullYear();
  const yearOptions = getYearOptions(currentYear);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const dateParts = parseDateParts(field.value as string | null | undefined);
        const dayOptions = createPaddedNumberRange({
          start: 1,
          end: getDaysInMonth({ year: dateParts.year, month: dateParts.month })
        });

        return (
          <FormItem>
            <div className="flex items-center justify-between gap-3">
              <FormLabel>{label}</FormLabel>
              {nullable && clearLabel && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 rounded-full px-3 text-xs text-muted-foreground"
                  onClick={() => field.onChange(null)}
                >
                  {clearLabel}
                </Button>
              )}
            </div>
            <FormControl>
              <div className="grid grid-cols-3 gap-3">
                <Select
                  value={dateParts.day || undefined}
                  onValueChange={day => {
                    field.onChange(
                      formatDateParts({
                        year: dateParts.year,
                        month: dateParts.month,
                        day
                      }) ?? (nullable ? null : '')
                    );
                  }}
                >
                  <SelectTrigger className="h-11 rounded-2xl bg-white/70 text-base dark:bg-white/5">
                    <SelectValue placeholder="DD" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {dayOptions.map(day => (
                      <SelectItem key={day} value={day} className="rounded-xl">
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={dateParts.month || undefined}
                  onValueChange={month => {
                    const nextDay = normalizeDayForMonth({
                      year: dateParts.year,
                      month,
                      day: dateParts.day
                    });

                    field.onChange(
                      formatDateParts({
                        year: dateParts.year,
                        month,
                        day: nextDay
                      }) ?? (nullable ? null : '')
                    );
                  }}
                >
                  <SelectTrigger className="h-11 rounded-2xl bg-white/70 text-base dark:bg-white/5">
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {MONTH_OPTIONS.map(month => (
                      <SelectItem key={month} value={month} className="rounded-xl">
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={dateParts.year || undefined}
                  onValueChange={year => {
                    const nextDay = normalizeDayForMonth({
                      year,
                      month: dateParts.month,
                      day: dateParts.day
                    });

                    field.onChange(
                      formatDateParts({
                        year,
                        month: dateParts.month,
                        day: nextDay
                      }) ?? (nullable ? null : '')
                    );
                  }}
                >
                  <SelectTrigger className="h-11 rounded-2xl bg-white/70 text-base dark:bg-white/5">
                    <SelectValue placeholder="YYYY" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {yearOptions.map(year => (
                      <SelectItem key={year} value={year} className="rounded-xl">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
