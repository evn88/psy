import { auth } from '@/auth';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';
import prisma from '@/lib/prisma';
import { getPayPalClientId, getPayPalDefaultCurrency } from '@/modules/payments/paypal/config';
import { formatPaymentAmount } from '@/modules/payments';
import { getTranslations } from 'next-intl/server';
import { requireAuthenticatedUser } from '@/lib/auth-helpers';

import { MyPaymentsHistory } from './_components/my-payments-history';
import { PaymentCheckoutCard } from './_components/payment-checkout-card';
import type {
  LocalizedPaymentText,
  PaymentServicePackage
} from './_components/payment-checkout.types';

interface MyPaymentsPageProps {
  params: Promise<{ locale: string }>;
}

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
  type ServicePackageRecord = (typeof packages)[number];

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
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('paymentsTitle')}</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Укажите сумму, выберите PayPal или оплату картой и завершите платёж. После подтверждения
          операция появится в истории ниже.
        </p>
      </div>

      <PaymentCheckoutCard
        clientId={clientId}
        currency={displayCurrency}
        balance={user.balance.toString()}
        packages={packages.map(
          (pkg: ServicePackageRecord): PaymentServicePackage => ({
            id: pkg.id,
            amount: pkg.amount.toString(),
            currency: pkg.currency,
            title: pkg.title as LocalizedPaymentText,
            description: pkg.description as LocalizedPaymentText | null,
            coverImage: pkg.coverImage
          })
        )}
        locale={currentLocale}
      />

      <MyPaymentsHistory payments={paymentHistory} />
    </div>
  );
}
