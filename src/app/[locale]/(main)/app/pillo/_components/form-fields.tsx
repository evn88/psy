import { type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

/**
 * Унифицированное текстовое поле для RHF.
 * @param props - control, имя, label и тип поля.
 * @returns Поле формы.
 */
export const TextField = <TFieldValues extends FieldValues>({
  control,
  label,
  name,
  type = 'text'
}: {
  control: Control<TFieldValues>;
  label: string;
  name: Path<TFieldValues>;
  type?: string;
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
              {...field}
              value={(field.value as string | number | null | undefined) ?? ''}
              type={type}
              step={type === 'number' ? '0.01' : undefined}
              className="h-11 rounded-2xl"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

/**
 * Унифицированный переключатель для RHF.
 * @param props - control, имя поля и подпись.
 * @returns Поле-переключатель.
 */
export const SwitchField = <TFieldValues extends FieldValues>({
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
        <FormItem className="flex items-center justify-between rounded-2xl border p-3">
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
};
