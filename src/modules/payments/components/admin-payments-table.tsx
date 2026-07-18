import { Link } from '@/i18n/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { PaymentStatusBadge } from '@/modules/payments/components/payment-status-badge';
import { PaymentsSyncButton } from '@/modules/payments/components/payments-sync-button';

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
 * Таблица платежей для админки.
 */
export const AdminPaymentsTable = ({
  payments,
  showClientColumn = true
}: AdminPaymentsTableProps) => {
  return (
    <div className="min-w-0 max-w-full">
      <div className="min-w-0 max-w-full overflow-hidden rounded-md border">
        <Table className="min-w-[1180px]">
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
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showClientColumn ? 10 : 9}
                  className="py-10 text-center text-muted-foreground"
                >
                  Платежи не найдены
                </TableCell>
              </TableRow>
            ) : (
              payments.map(payment => (
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
                  <TableCell className="text-right">
                    <PaymentsSyncButton compact paymentIds={[payment.id]} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
