import { type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { PilloSwitchControl } from './pillo-switch-control';

/**
 * Рисует унифицированный переключатель для RHF.
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
        <FormItem className="flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-black/[0.05] bg-white/60 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03]">
          <FormLabel className="m-0 leading-5">{label}</FormLabel>
          <FormControl>
            <PilloSwitchControl checked={Boolean(field.value)} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
};
