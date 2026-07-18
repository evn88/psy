import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getFinancialHistorySourceLabel,
  type FinancialHistorySource
} from '@/modules/payments/financial/financial-history-source';

interface FinancialSourceBadgeProps {
  source: FinancialHistorySource;
  providerLabel?: string | null;
  className?: string;
}

/**
 * Показывает происхождение финансовой операции без смешивания с её статусом.
 */
export const FinancialSourceBadge = ({
  source,
  providerLabel,
  className
}: FinancialSourceBadgeProps) => {
  return (
    <Badge
      variant="outline"
      className={cn(
        'w-fit max-w-full whitespace-normal font-medium',
        source === 'ADMIN_ADJUSTMENT' &&
          'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
        source === 'PAYMENT_PROVIDER' &&
          'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
        source === 'INTERNAL_OPERATION' && 'bg-muted/40 text-muted-foreground',
        className
      )}
    >
      {getFinancialHistorySourceLabel(source, providerLabel)}
    </Badge>
  );
};
