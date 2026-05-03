import { LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Показывает компактный индикатор фоновой обработки действия.
 * @param props - текст и дополнительные классы.
 * @returns Строка со спиннером и подписью.
 */
export const PilloPendingIndicator = ({
  className,
  label
}: {
  className?: string;
  label: string;
}) => {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LoaderCircle className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </span>
  );
};
