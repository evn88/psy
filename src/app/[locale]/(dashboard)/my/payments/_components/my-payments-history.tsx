import { ChevronDown, ReceiptText } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { FinancialSourceBadge } from '@/modules/payments/components/financial-source-badge';
import { PaymentStatusBadge } from '@/modules/payments/components/payment-status-badge';

import type { FinancialHistorySource } from '@/modules/payments/financial/financial-history-source';

interface MyPaymentHistoryItem {
  id: string;
  orderId: string | null;
  amountLabel: string;
  amountValue: number;
  direction: 'INCOME' | 'EXPENSE' | 'REFUND' | 'NEUTRAL';
  status: string;
  title: string;
  source: FinancialHistorySource;
  providerLabel: string | null;
  createdAtLabel: string;
}

interface MyPaymentsHistoryProps {
  payments: MyPaymentHistoryItem[];
}

/**
 * Сворачиваемая история финансовых операций без пользовательских действий.
 */
export const MyPaymentsHistory = ({ payments }: MyPaymentsHistoryProps) => {
  return (
    <details className="group overflow-hidden rounded-2xl border bg-card shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-5 transition-colors hover:bg-muted/30 [&::-webkit-details-marker]:hidden sm:px-6">
        <span className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
            <ReceiptText className="size-4" aria-hidden />
          </span>
          <span>
            <span className="block font-semibold">История операций</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              {payments.length === 0
                ? 'Пополнения и списания появятся здесь'
                : `${payments.length} ${payments.length === 1 ? 'операция' : 'операций'}`}
            </span>
          </span>
        </span>
        <ChevronDown
          className="size-5 transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>

      <div className="border-t">
        <div className="grid gap-3 p-4 md:hidden">
          {payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Финансовых операций пока нет
            </p>
          ) : (
            payments.map(payment => (
              <article key={payment.id} className="rounded-xl border bg-muted/15 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={cn(
                        'font-semibold',
                        payment.direction === 'INCOME' && 'text-emerald-600',
                        (payment.direction === 'EXPENSE' || payment.direction === 'REFUND') &&
                          'text-rose-600'
                      )}
                    >
                      {payment.amountLabel}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{payment.title}</p>
                    <FinancialSourceBadge
                      source={payment.source}
                      providerLabel={payment.providerLabel}
                      className="mt-2"
                    />
                  </div>
                  <PaymentStatusBadge status={payment.status} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{payment.createdAtLabel}</p>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  Order ID: {payment.orderId || '—'}
                </p>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Операция</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                    Финансовых операций пока нет
                  </TableCell>
                </TableRow>
              ) : (
                payments.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <p className="font-medium">{payment.title}</p>
                      <FinancialSourceBadge
                        source={payment.source}
                        providerLabel={payment.providerLabel}
                        className="mt-1"
                      />
                    </TableCell>
                    <TableCell
                      className={cn(
                        'font-semibold tabular-nums',
                        payment.direction === 'INCOME' && 'text-emerald-600',
                        (payment.direction === 'EXPENSE' || payment.direction === 'REFUND') &&
                          'text-rose-600'
                      )}
                    >
                      {payment.amountLabel}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell className="max-w-48 truncate font-mono text-xs">
                      {payment.id}
                    </TableCell>
                    <TableCell className="max-w-48 truncate font-mono text-xs">
                      {payment.orderId || '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{payment.createdAtLabel}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </details>
  );
};
