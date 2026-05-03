import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PaymentStatusBadgeProps {
  status: string;
}

interface PaymentStatusMeta {
  className: string;
  label: string;
}

const DEFAULT_STATUS_META: PaymentStatusMeta = {
  className:
    'border-slate-200/70 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300',
  label: 'Неизвестно'
};

const PAYMENT_STATUS_META: Record<string, PaymentStatusMeta> = {
  CREATED: {
    className:
      'border-slate-200/70 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300',
    label: 'Создан'
  },
  SAVED: {
    className:
      'border-slate-200/70 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300',
    label: 'Сохранён'
  },
  APPROVED: {
    className:
      'border-sky-200/70 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
    label: 'Одобрен'
  },
  COMPLETED: {
    className:
      'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
    label: 'Завершён'
  },
  PENDING: {
    className:
      'border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
    label: 'В ожидании'
  },
  PARTIALLY_REFUNDED: {
    className:
      'border-orange-200/70 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300',
    label: 'Частичный возврат'
  },
  REFUNDED: {
    className:
      'border-orange-200/70 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300',
    label: 'Возврат'
  },
  REVERSED: {
    className:
      'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
    label: 'Откат'
  },
  DECLINED: {
    className:
      'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
    label: 'Отклонён'
  },
  DENIED: {
    className:
      'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
    label: 'Отклонён'
  },
  FAILED: {
    className:
      'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
    label: 'Ошибка'
  },
  CANCELLED: {
    className:
      'border-slate-200/70 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300',
    label: 'Отменён'
  }
};

/**
 * Возвращает визуальные метаданные статуса платежа.
 * @param status - Статус платежа из базы данных.
 * @returns Понятная подпись и стили для бейджа.
 */
const getPaymentStatusMeta = (status: string): PaymentStatusMeta => {
  return PAYMENT_STATUS_META[status.toUpperCase()] ?? DEFAULT_STATUS_META;
};

/**
 * Бейдж статуса платежа с более современной цветовой семантикой.
 * @param props - Пропсы компонента.
 * @returns Отформатированный статус платежа.
 */
export const PaymentStatusBadge = ({ status }: PaymentStatusBadgeProps) => {
  const normalizedStatus = status.toUpperCase();
  const { className, label } = getPaymentStatusMeta(normalizedStatus);

  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide shadow-sm',
        className
      )}
      title={normalizedStatus}
    >
      {label}
    </Badge>
  );
};
