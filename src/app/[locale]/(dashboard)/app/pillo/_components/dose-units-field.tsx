import { type Control, type FieldValues, type Path } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export const DoseUnitsField = <TFieldValues extends FieldValues>({
  control,
  description,
  label,
  name
}: {
  control: Control<TFieldValues>;
  description?: string;
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
            <Input
              name={field.name}
              ref={field.ref}
              value={String(field.value ?? '')}
              onBlur={field.onBlur}
              onChange={event => field.onChange(event.target.value)}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className="h-11 rounded-2xl bg-white/70 text-base dark:bg-white/5"
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
