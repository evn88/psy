import { Switch } from '@/components/ui/switch';

/**
 * Рисует переключатель Pillo в локальном стиле экрана.
 * @param props - состояние, disabled и обработчик смены значения.
 * @returns Стилизованный переключатель.
 */
export const PilloSwitchControl = ({
  checked,
  disabled,
  onCheckedChange
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => {
  return (
    <Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      className="self-center data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-black/10 dark:data-[state=unchecked]:bg-white/10"
    />
  );
};
