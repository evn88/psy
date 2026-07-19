import { auth } from '@/auth';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';
import prisma from '@/lib/prisma';
import {
  getEnabledPaymentCheckoutConfigs,
  getInstalledPaymentConnectorMetadata
} from '@/modules/payments/connectors/registry.server';
import { getTranslations } from 'next-intl/server';
import { requireAuthenticatedUser } from '@/lib/auth-helpers';
import { CreditCard, PackageCheck } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { getFinancialHistory } from '@/modules/payments/financial/financial-history.server';
import type { FinancialHistoryItem } from '@/modules/payments/financial/financial-history-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  const [historyResult, packagesResult, purchasedPackagesResult, providerConfigs] =
    await Promise.all([
      getFinancialHistory({ userId: user.id, take: 500 }),
      prisma.servicePackage.findMany({
        where: { isActive: true, currency: 'EUR' },
        orderBy: { order: 'asc' }
      }),
      prisma.purchasedPackage.findMany({
        where: { userId: user.id },
        orderBy: { purchasedAt: 'desc' }
      }),
      getEnabledPaymentCheckoutConfigs()
    ]);
  type ServicePackageRecord = Prisma.ServicePackageGetPayload<Record<string, never>>;
  type PurchasedPackageRecord = Prisma.PurchasedPackageGetPayload<Record<string, never>>;
  const packages = packagesResult as ServicePackageRecord[];
  const purchasedPackages = purchasedPackagesResult as PurchasedPackageRecord[];
  const history = historyResult as FinancialHistoryItem[];

  const providerLabelById = new Map(
    providerMetadata.map(provider => [provider.id, provider.label])
  );
  const paymentHistory = history.map(item => ({
    id: item.id,
    orderId: item.orderId,
    amountLabel: item.amountLabel,
    amountValue: item.amountValue,
    direction: item.direction,
    createdAtLabel: item.createdAtLabel,
    providerLabel: item.provider ? (providerLabelById.get(item.provider) ?? item.provider) : null,
    source: item.source,
    status: item.status,
    title: item.title
  }));
  const getPackageTitle = (title: unknown): string => {
    if (typeof title === 'string') return title;
    if (title && typeof title === 'object' && !Array.isArray(title)) {
      const localized = title as Record<string, unknown>;
      const value = localized[currentLocale] ?? localized.ru;
      if (typeof value === 'string') return value;
    }
    return 'Пакет консультаций';
  };

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
        currency="EUR"
        balance={user.balance.toString()}
        packages={packages.map(
          (pkg: ServicePackageRecord): PaymentServicePackage => ({
            id: pkg.id,
            amount: pkg.amount.toString(),
            currency: 'EUR',
            includedMinutes: pkg.includedMinutes,
            title: pkg.title as LocalizedPaymentText,
            description: pkg.description as LocalizedPaymentText | null,
            coverImage: pkg.coverImage
          })
        )}
        locale={currentLocale}
        providerConfigs={providerConfigs}
      />

      {purchasedPackages.length > 0 && (
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PackageCheck className="text-primary" />
              Мои пакеты
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {purchasedPackages.map(purchasedPackage => (
              <div key={purchasedPackage.id} className="rounded-xl border bg-muted/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{getPackageTitle(purchasedPackage.titleSnapshot)}</p>
                  <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold">
                    {purchasedPackage.status}
                  </span>
                </div>
                <p className="mt-4 text-2xl font-semibold tabular-nums">
                  {purchasedPackage.remainingMinutes}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    из {purchasedPackage.totalMinutes} мин.
                  </span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Куплен {purchasedPackage.purchasedAt.toLocaleDateString('ru-RU')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <MyPaymentsHistory payments={paymentHistory} />
    </div>
  );
}
