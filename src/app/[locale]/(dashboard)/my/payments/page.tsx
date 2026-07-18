import { auth } from '@/auth';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';
import prisma from '@/lib/prisma';
import { formatPaymentAmount } from '@/modules/payments';
import {
  getEnabledPaymentCheckoutConfigs,
  getInstalledPaymentConnectorMetadata
} from '@/modules/payments/connectors/registry.server';
import { getTranslations } from 'next-intl/server';
import { requireAuthenticatedUser } from '@/lib/auth-helpers';
import { CreditCard } from 'lucide-react';

import { MyPaymentsHistory } from './_components/my-payments-history';
import { PaymentCheckoutCard } from './_components/payment-checkout-card';
import type {
  LocalizedPaymentText,
  PaymentServicePackage
} from './_components/payment-checkout.types';
import type { PaymentConnectorMetadata } from '@/modules/payments/connectors/types';

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

  const providerMetadata: PaymentConnectorMetadata[] = getInstalledPaymentConnectorMetadata();
  const [payments, packages, providerConfigs] = await Promise.all([
    prisma.payment.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        amount: true,
        capturedAt: true,
        createdAt: true,
        currency: true,
        orderId: true,
        provider: true,
        status: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.servicePackage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    }),
    getEnabledPaymentCheckoutConfigs()
  ]);
  type PaymentRecord = (typeof payments)[number];
  type ServicePackageRecord = (typeof packages)[number];

  const displayCurrency =
    payments[0]?.currency || providerConfigs[0]?.defaultCurrency || packages[0]?.currency || 'EUR';
  const paymentLocale =
    currentLocale === 'en' ? 'en-US' : currentLocale === 'sr' ? 'sr-RS' : 'ru-RU';
  const providerLabelById = new Map(
    providerMetadata.map(provider => [provider.id, provider.label])
  );
  const paymentHistory = payments.map((payment: PaymentRecord) => ({
    id: payment.id,
    amountLabel: formatPaymentAmount(payment.amount, payment.currency, paymentLocale),
    capturedAtLabel: payment.capturedAt ? payment.capturedAt.toLocaleString(paymentLocale) : '—',
    createdAtLabel: payment.createdAt.toLocaleString(paymentLocale),
    orderId: payment.orderId,
    providerLabel: providerLabelById.get(payment.provider) ?? payment.provider,
    status: payment.status
  }));

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">{t('paymentsTitle')}</p>
          <h1 className="text-3xl font-bold tracking-tight">Баланс и оплата</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Выберите пакет или пополните баланс. После подтверждения платёж появится в истории.
          </p>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CreditCard className="size-6" aria-hidden />
        </div>
      </div>

      <PaymentCheckoutCard
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
        providerConfigs={providerConfigs}
      />

      <MyPaymentsHistory payments={paymentHistory} />
    </div>
  );
}
