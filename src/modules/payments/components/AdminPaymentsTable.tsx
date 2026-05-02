'use client';

import { useDeferredValue, useState } from 'react';
import { Search } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { PaymentStatusBadge } from '@/modules/payments/components/PaymentStatusBadge';

export interface AdminPaymentTableItem {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  provider: string;
  orderId: string;
  captureId: string | null;
  amountLabel: string;
  status: string;
  createdAtLabel: string;
  capturedAtLabel: string;
  lastSyncedAtLabel: string;
}

interface AdminPaymentsTableProps {
  payments: AdminPaymentTableItem[];
  showClientColumn?: boolean;
}

/**
 * Таблица платежей для админки с локальным поиском по клиенту и идентификаторам PayPal.
 */
export const AdminPaymentsTable = ({
  payments,
  showClientColumn = true
}: AdminPaymentsTableProps) => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredPayments = payments.filter(payment => {
    if (!deferredQuery) {
      return true;
    }

    return [
      payment.clientName,
      payment.clientEmail,
      payment.orderId,
      payment.captureId || '',
      payment.status
    ]
      .join(' ')
      .toLowerCase()
      .includes(deferredQuery);
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Поиск по клиенту, order id или capture id"
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showClientColumn ? <TableHead>Клиент</TableHead> : null}
              <TableHead>Провайдер</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Capture ID</TableHead>
              <TableHead>Создан</TableHead>
              <TableHead>Оплачен</TableHead>
              <TableHead>Последняя синхронизация</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showClientColumn ? 8 : 7}
                  className="py-10 text-center text-muted-foreground"
                >
                  Платежи не найдены
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map(payment => (
                <TableRow key={payment.id}>
                  {showClientColumn ? (
                    <TableCell>
                      <div className="flex flex-col">
                        <Link
                          href={`/admin/clients/${payment.clientId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {payment.clientName}
                        </Link>
                        <span className="text-xs text-muted-foreground">{payment.clientEmail}</span>
                      </div>
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                      {payment.provider}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{payment.amountLabel}</TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{payment.orderId}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {payment.captureId || '—'}
                  </TableCell>
                  <TableCell>{payment.createdAtLabel}</TableCell>
                  <TableCell>{payment.capturedAtLabel}</TableCell>
                  <TableCell>{payment.lastSyncedAtLabel}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
