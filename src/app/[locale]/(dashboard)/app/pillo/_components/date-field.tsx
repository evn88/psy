import { type Control, type FieldValues, type Path } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';

/**
 * Рисует локализованный календарный picker для даты правила Pillo.
 * @param props - control, имя поля, подпись и опции nullable.
 * @returns Поле даты на базе общего shadcn DatePicker.
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
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between gap-3">
            <FormLabel>{label}</FormLabel>
            {nullable && clearLabel && (
              <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange(null)}>
                {clearLabel}
              </Button>
            )}
          </div>
          <FormControl>
            <DatePicker
              value={field.value as string | null | undefined}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              className="h-11 rounded-2xl"
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
