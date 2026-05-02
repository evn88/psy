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

/**
 * Рисует унифицированное текстовое поле для RHF.
 * @param props - control, имя, label, тип поля и опциональное описание.
 * @returns Поле формы.
 */
export const TextField = <TFieldValues extends FieldValues>({
  control,
  label,
  name,
  type = 'text',
  integer = false,
  description
}: {
  control: Control<TFieldValues>;
  label: string;
  name: Path<TFieldValues>;
  type?: string;
  integer?: boolean;
  description?: string;
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
              step={type === 'number' ? (integer ? '1' : '0.01') : undefined}
              inputMode={integer ? 'numeric' : undefined}
              min={type === 'number' ? '0' : undefined}
              onKeyDown={event => {
                if (type === 'number' && event.key === '-') {
                  event.preventDefault();
                }
                if (integer && ['.', ',', 'e', 'E', '+'].includes(event.key)) {
                  event.preventDefault();
                }
              }}
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
