import { type Control, type FieldValues, type Path } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TimePicker } from '@/components/ui/time-picker';

/**
 * Рисует единый picker времени для правила Pillo.
 * @param props - control, имя поля и подпись.
 * @returns Поле времени на базе общего shadcn TimePicker.
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
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <TimePicker
              value={field.value as string | null | undefined}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              className="h-11 rounded-2xl"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
