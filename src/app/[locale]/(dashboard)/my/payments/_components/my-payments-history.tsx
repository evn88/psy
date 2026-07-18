import { ChevronDown, ReceiptText } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { PaymentStatusBadge } from '@/modules/payments/components/payment-status-badge';

interface MyPaymentHistoryItem {
  id: string;
  amountLabel: string;
  amountValue: number;
  direction: 'INCOME' | 'EXPENSE' | 'REFUND' | 'NEUTRAL';
  status: string;
  title: string;
  providerLabel: string;
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
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border bg-card px-5 py-4 shadow-sm transition-colors hover:bg-muted/20 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ReceiptText />
          </span>
          <span>
            <span className="block font-semibold">История операций</span>
            <span className="block text-xs text-muted-foreground">
              {payments.length} транзакций, пополнений и списаний
            </span>
          </span>
        </span>
        <ChevronDown className="transition-transform group-open:rotate-180" />
      </summary>

      <Card className="mt-3 overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="grid gap-3 p-4 md:hidden">
            {payments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Финансовых операций пока нет
              </p>
            ) : (
              payments.map(payment => (
                <article key={payment.id} className="rounded-xl border p-4">
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
                      <p className="mt-1 text-xs text-muted-foreground">{payment.title}</p>
                    </div>
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {payment.createdAtLabel} · {payment.providerLabel}
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
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                      Финансовых операций пока нет
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <p className="font-medium">{payment.title}</p>
                        <p className="text-xs text-muted-foreground">{payment.providerLabel}</p>
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
                      <TableCell className="whitespace-nowrap">{payment.createdAtLabel}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </details>
  );
};
