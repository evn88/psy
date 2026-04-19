import { auth } from '@/auth';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';
import prisma from '@/shared/lib/prisma';
import { getPayPalClientId, getPayPalDefaultCurrency } from '@/shared/lib/paypal/config';
import { formatPaymentAmount } from '@/shared/lib/payments';
import { getTranslations } from 'next-intl/server';

import { MyPaymentsHistory } from './_components/my-payments-history';
import { PaymentCheckoutCard } from './_components/payment-checkout-card';

interface MyPaymentsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Возвращает авторизованного пользователя или выполняет locale-aware redirect на вход.
 * Дополнительный `throw` нужен только для корректного сужения типов после redirect.
 * @param user - пользователь из сессии.
 * @param locale - активная locale.
 * @returns Авторизованный пользователь.
 */
const requireAuthenticatedUser = <TUser,>(
  user: TUser | null | undefined,
  locale: AppLocale
): TUser => {
  if (!user) {
    redirect({ href: '/auth', locale });
    throw new Error('UNREACHABLE_AUTH_REDIRECT');
  }

  return user;
};

/**
 * Страница оплаты услуг для клиента.
 * Сначала показывает checkout PayPal, затем историю операций.
 * @param props - locale из маршрута.
 * @returns Серверная страница оплаты.
 */
export default async function MyPaymentsPage({ params }: Readonly<MyPaymentsPageProps>) {
  const { locale } = await params;
  const currentLocale: AppLocale = isLocale(locale) ? locale : defaultLocale;
  const session = await auth();
  const t = await getTranslations('My');
  const user = await prisma.user.findUnique({
    where: { id: requireAuthenticatedUser(session?.user, currentLocale).id },
    select: { id: true, balance: true, role: true }
  });

  if (!user || user.role === 'GUEST') {
    redirect({ href: '/my/profile', locale: currentLocale });
  }

  const [payments, packages] = await Promise.all([
    prisma.payment.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        amount: true,
        capturedAt: true,
        createdAt: true,
        currency: true,
        orderId: true,
        status: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.servicePackage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })
  ]);
  type PaymentRecord = (typeof payments)[number];

  const displayCurrency = payments[0]?.currency || getPayPalDefaultCurrency();
  const paymentLocale =
    currentLocale === 'en' ? 'en-US' : currentLocale === 'sr' ? 'sr-RS' : 'ru-RU';
  const paymentHistory = payments.map((payment: PaymentRecord) => ({
    id: payment.id,
    amountLabel: formatPaymentAmount(payment.amount, payment.currency, paymentLocale),
    capturedAtLabel: payment.capturedAt ? payment.capturedAt.toLocaleString(paymentLocale) : '—',
    createdAtLabel: payment.createdAt.toLocaleString(paymentLocale),
    orderId: payment.orderId,
    status: payment.status
  }));

  const clientId = getPayPalClientId();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('paymentsTitle')}</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Укажите сумму, выберите PayPal или оплату картой и завершите платёж. После подтверждения
          операция появится в истории ниже.
        </p>
      </section>

      <PaymentCheckoutCard
        clientId={clientId}
        currency={displayCurrency}
        balance={user.balance.toString()}
        packages={packages.map((p: any) => ({ ...p, amount: p.amount.toString() }))}
        locale={currentLocale}
      />

      <MyPaymentsHistory payments={paymentHistory} />
    </div>
  );
}
