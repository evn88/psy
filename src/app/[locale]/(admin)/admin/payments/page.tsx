import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminPaymentsTable } from '@/modules/payments/components/AdminPaymentsTable';
import { PaymentsSyncButton } from '@/modules/payments/components/PaymentsSyncButton';
import prisma from '@/lib/prisma';
import {
  formatPaymentAmount,
  getCurrentMonthPaymentsTotal,
  isSuccessfulPaymentStatus
} from '@/modules/payments';
import { getPayPalDefaultCurrency } from '@/modules/payments/paypal/config';

/**
 * Общая страница оплат в админке.
 * Показывает все локальные платежи и позволяет вручную сверить их с PayPal.
 */
export default async function AdminPaymentsPage() {
  const payments = await prisma.payment.findMany({
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
  type AdminPaymentRecord = (typeof payments)[number];

  const currentMonthTotal = getCurrentMonthPaymentsTotal(payments);
  const successfulCount = payments.filter((payment: AdminPaymentRecord) =>
    isSuccessfulPaymentStatus(payment.status)
  ).length;
  const pendingCount = payments.filter(
    (payment: AdminPaymentRecord) => payment.status === 'PENDING'
  ).length;
  const refundedCount = payments.filter((payment: AdminPaymentRecord) =>
    payment.status.includes('REFUND')
  ).length;
  const displayCurrency = payments[0]?.currency || getPayPalDefaultCurrency();

  const tableItems = payments.map((payment: AdminPaymentRecord) => ({
    id: payment.id,
    clientId: payment.user.id,
    clientName: payment.user.name || 'Без имени',
    clientEmail: payment.user.email,
    provider: payment.provider,
    orderId: payment.orderId,
    captureId: payment.captureId,
    amountLabel: formatPaymentAmount(payment.amount, payment.currency),
    status: payment.status,
    createdAtLabel: payment.createdAt.toLocaleString('ru-RU'),
    capturedAtLabel: payment.capturedAt ? payment.capturedAt.toLocaleString('ru-RU') : '—',
    lastSyncedAtLabel: payment.lastSyncedAt ? payment.lastSyncedAt.toLocaleString('ru-RU') : '—'
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Платежи</h2>
          <p className="text-muted-foreground">
            Локальный реестр платежей PayPal. Источник правды для интерфейса — база данных, сверка
            выполняется через PayPal REST API.
          </p>
        </div>
        <PaymentsSyncButton
          paymentIds={payments.map((payment: AdminPaymentRecord) => payment.id)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Оплаты за месяц</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPaymentAmount(currentMonthTotal, displayCurrency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Успешные платежи</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successfulCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ожидают обработки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Возвраты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{refundedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle>Все операции</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <AdminPaymentsTable payments={tableItems} />
        </CardContent>
      </Card>
    </div>
  );
}
