import { AdminPaymentsTable } from '@/modules/payments/components/admin-payments-table';
import prisma from '@/lib/prisma';
import { formatPaymentAmount } from '@/modules/payments';
import { PaymentsSyncButton } from '@/modules/payments/components/payments-sync-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ClientPaymentsProps {
  clientId: string;
}

/**
 * Вкладка платежей конкретного клиента внутри админской карточки.
 */
export const ClientPayments = async ({ clientId }: ClientPaymentsProps) => {
  const payments = await prisma.payment.findMany({
    where: { userId: clientId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  type ClientPaymentRecord = (typeof payments)[number];

  const tableItems = payments.map((payment: ClientPaymentRecord) => ({
    id: payment.id,
    clientId: payment.user.id,
    clientName: payment.user.name || 'Без имени',
    clientEmail: payment.user.email,
    orderId: payment.orderId,
    captureId: payment.captureId,
    amountLabel: formatPaymentAmount(payment.amount, payment.currency),
    status: payment.status,
    createdAtLabel: payment.createdAt.toLocaleString('ru-RU'),
    capturedAtLabel: payment.capturedAt ? payment.capturedAt.toLocaleString('ru-RU') : '—',
    lastSyncedAtLabel: payment.lastSyncedAt ? payment.lastSyncedAt.toLocaleString('ru-RU') : '—'
  }));

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-xl">Платежи клиента</CardTitle>
          <CardDescription>
            Локальная история оплат по клиенту с возможностью ручной сверки через PayPal API.
          </CardDescription>
        </div>
        <PaymentsSyncButton
          paymentIds={payments.map((payment: ClientPaymentRecord) => payment.id)}
          userId={clientId}
        />
      </CardHeader>
      <CardContent className="pt-6">
        <AdminPaymentsTable payments={tableItems} showClientColumn={false} />
      </CardContent>
    </Card>
  );
};
