import { auth } from '@/auth';
import { PackageCheck, Wallet } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Prisma } from '@prisma/client';

import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';
import { requireAuthenticatedUser } from '@/lib/auth-helpers';
import prisma from '@/lib/prisma';
import { formatPaymentAmount } from '@/modules/payments';
import {
  getEnabledPaymentCheckoutConfigs,
  getInstalledPaymentConnectorMetadata
} from '@/modules/payments/connectors/registry.server';
import { getFinancialHistory } from '@/modules/payments/financial/financial-history.server';
import type { FinancialHistoryItem } from '@/modules/payments/financial/financial-history-table';
import type { PaymentConnectorMetadata } from '@/modules/payments/connectors/types';

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
 * Страница оплаты услуг для клиента с отдельными сценариями покупки пакета и пополнения.
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
  const packageStatusLabels = {
    ACTIVE: 'Активен',
    EXHAUSTED: 'Использован',
    EXPIRED: 'Срок истёк',
    SUSPENDED: 'Приостановлен',
    REVOKED: 'Отменён'
  } as const;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-9 px-4 pb-12 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-primary">{t('paymentsTitle')}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Оплата услуг</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Купите пакет консультаций или пополните баланс для будущих оплат.
        </p>
      </header>

      <div className={purchasedPackages.length > 0 ? 'grid gap-6 lg:grid-cols-2' : undefined}>
        <section
          className="rounded-2xl border bg-card px-5 py-5 shadow-sm sm:px-6"
          aria-label="Баланс"
        >
          <div className="flex items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Wallet className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Доступно на балансе</p>
              <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">
                {formatPaymentAmount(user.balance, 'EUR')}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Баланс можно использовать для оплаты пакетов и консультаций.
          </p>
        </section>

        {purchasedPackages.length > 0 ? (
          <section
            className="overflow-hidden rounded-2xl border bg-card shadow-sm"
            aria-labelledby="my-packages-title"
          >
            <div className="flex items-center gap-3 px-5 py-5 sm:px-6">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                <PackageCheck className="size-4" aria-hidden />
              </span>
              <div>
                <h2 id="my-packages-title" className="font-semibold">
                  Мои пакеты
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Оставшееся время консультаций
                </p>
              </div>
            </div>
            <ul className="border-t divide-y">
              {purchasedPackages.map(purchasedPackage => (
                <li
                  key={purchasedPackage.id}
                  className="grid gap-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{getPackageTitle(purchasedPackage.titleSnapshot)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Куплен {purchasedPackage.purchasedAt.toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {packageStatusLabels[purchasedPackage.status]}
                    </span>
                    <p className="text-sm font-semibold tabular-nums">
                      {purchasedPackage.remainingMinutes}{' '}
                      <span className="font-normal text-muted-foreground">
                        из {purchasedPackage.totalMinutes} мин.
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
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

      <MyPaymentsHistory payments={paymentHistory} />
    </div>
  );
}
