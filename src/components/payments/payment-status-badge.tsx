import { Badge } from '@/components/ui/badge';

const PAYMENT_STATUS_VARIANTS: Record<string, string> = {
  CREATED: 'bg-muted text-muted-foreground',
  SAVED: 'bg-muted text-muted-foreground',
  APPROVED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-700',
  REFUNDED: 'bg-orange-100 text-orange-700',
  REVERSED: 'bg-rose-100 text-rose-700',
  DECLINED: 'bg-rose-100 text-rose-700',
  DENIED: 'bg-rose-100 text-rose-700',
  FAILED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-muted text-muted-foreground'
};

/**
 * Бейдж статуса платежа с базовой цветовой семантикой.
 */
export const PaymentStatusBadge = ({ status }: { status: string }) => {
  const normalizedStatus = status.toUpperCase();
  const className = PAYMENT_STATUS_VARIANTS[normalizedStatus] || 'bg-muted text-muted-foreground';

  return (
    <Badge variant="outline" className={className}>
      {normalizedStatus}
    </Badge>
  );
};
