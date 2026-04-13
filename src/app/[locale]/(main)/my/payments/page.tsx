import { auth } from '@/auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CreditCard, Wallet } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import prisma from '@/shared/lib/prisma';
import {
  formatPaymentAmount,
  getCurrentMonthPaymentsTotal,
  isSuccessfulPaymentStatus
} from '@/shared/lib/payments';
import { getPayPalClientId, getPayPalDefaultCurrency } from '@/shared/lib/paypal/config';
import { PayPalCheckoutCard } from './_components/paypal-checkout-card';
import { MyPaymentsHistory } from './_components/my-payments-history';

/**
 * Страница оплаты в личном кабинете.
 * Показывает checkout через PayPal и локальную историю транзакций пользователя.
 */
export default async function MyPaymentsPage() {
  const session = await auth();
  const t = await getTranslations('My');

  if (!session?.user?.id) {
    return null;
  }

  const payments = await prisma.payment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' }
  });
  type MyPaymentRecord = (typeof payments)[number];

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() || null;
  const currency = getPayPalDefaultCurrency();
  const currentMonthTotal = getCurrentMonthPaymentsTotal(payments);
  const successfulPaymentsCount = payments.filter((payment: MyPaymentRecord) =>
    isSuccessfulPaymentStatus(payment.status)
  ).length;
  const lastSuccessfulPayment = payments.find((payment: MyPaymentRecord) =>
    isSuccessfulPaymentStatus(payment.status)
  );

  const paymentHistoryItems = payments.map((payment: MyPaymentRecord) => ({
    id: payment.id,
    amountLabel: formatPaymentAmount(payment.amount, payment.currency),
    status: payment.status,
    orderId: payment.orderId,
    createdAtLabel: payment.createdAt.toLocaleString('ru-RU'),
    capturedAtLabel: payment.capturedAt ? payment.capturedAt.toLocaleString('ru-RU') : '—'
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('paymentsTitle')}</h2>
        <p className="text-muted-foreground mt-1">
          Оплата выполняется через PayPal Checkout, а история операций хранится в вашем кабинете.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Оплачено за месяц
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPaymentAmount(currentMonthTotal, currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Успешные платежи
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successfulPaymentsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Последняя успешная оплата</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastSuccessfulPayment
                ? formatPaymentAmount(lastSuccessfulPayment.amount, lastSuccessfulPayment.currency)
                : '—'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {lastSuccessfulPayment?.capturedAt
                ? lastSuccessfulPayment.capturedAt.toLocaleString('ru-RU')
                : 'Пока нет завершённых оплат'}
            </p>
          </CardContent>
        </Card>
      </div>

      {clientId ? (
        <PayPalCheckoutCard clientId={getPayPalClientId()} currency={currency} />
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>PayPal не настроен</AlertTitle>
          <AlertDescription>
            Добавьте `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` и `PAYPAL_WEBHOOK_ID` в
            env, чтобы включить checkout и синхронизацию webhook.
          </AlertDescription>
        </Alert>
      )}

      <MyPaymentsHistory payments={paymentHistoryItems} />
    </div>
  );
}
