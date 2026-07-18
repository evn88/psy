import { endOfMonth, startOfMonth } from 'date-fns';
import { ArrowUpRight, PackageOpen, Settings2, WalletCards } from 'lucide-react';
import type { Prisma } from '@prisma/client';

import {
  BalanceAdjustmentButton,
  ConsultationRateCard,
  PurchasedPackagesTable,
  type FinancialClientOption,
  type PurchasedPackageItem
} from './_components/financial-controls';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from '@/i18n/navigation';
import prisma from '@/lib/prisma';
import {
  FinancialHistoryTable,
  type FinancialHistoryItem
} from '@/modules/payments/financial/financial-history-table';
import { getFinancialHistory } from '@/modules/payments/financial/financial-history.server';
import { PaymentsSyncButton } from '@/modules/payments/components/payments-sync-button';

export const dynamic = 'force-dynamic';

const getTitle = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const localized = value as Record<string, unknown>;
    for (const locale of ['ru', 'en', 'sr']) {
      if (typeof localized[locale] === 'string') return localized[locale];
    }
  }
  return 'Пакет';
};

/**
 * Единый финансовый рабочий стол: ledger, тариф, возвраты и купленные пакеты.
 */
const AdminPaymentsPage = async () => {
  const now = new Date();
  const [historyResult, clientsResult, rate, purchasedPackagesResult, monthTransactionsResult] =
    await Promise.all([
      getFinancialHistory({ take: 750 }),
      prisma.user.findMany({
        where: { role: { not: 'GUEST' }, isDisabled: false },
        select: { balance: true, email: true, id: true, name: true },
        orderBy: [{ name: 'asc' }, { email: 'asc' }]
      }),
      prisma.consultationRate.findUnique({
        where: { id: 'default' },
        select: { amount: true }
      }),
      prisma.purchasedPackage.findMany({
        include: {
          user: {
            select: { email: true, name: true }
          }
        },
        orderBy: { purchasedAt: 'desc' },
        take: 500
      }),
      prisma.walletTransaction.findMany({
        where: {
          createdAt: {
            gte: startOfMonth(now),
            lte: endOfMonth(now)
          }
        },
        select: { amount: true }
      })
    ]);
  type ClientRecord = Prisma.UserGetPayload<{
    select: { balance: true; email: true; id: true; name: true };
  }>;
  type PurchasedPackageRecord = Prisma.PurchasedPackageGetPayload<{
    include: { user: { select: { email: true; name: true } } };
  }>;
  type MonthTransactionRecord = Prisma.WalletTransactionGetPayload<{
    select: { amount: true };
  }>;
  const clients = clientsResult as ClientRecord[];
  const history = historyResult as FinancialHistoryItem[];
  const purchasedPackages = purchasedPackagesResult as PurchasedPackageRecord[];
  const monthTransactions = monthTransactionsResult as MonthTransactionRecord[];

  const clientOptions: FinancialClientOption[] = clients.map(client => ({
    id: client.id,
    name: client.name || 'Без имени',
    email: client.email,
    balance: client.balance.toFixed(2)
  }));
  const packageItems: PurchasedPackageItem[] = purchasedPackages.map(purchasedPackage => ({
    id: purchasedPackage.id,
    userId: purchasedPackage.userId,
    clientName: purchasedPackage.user.name || 'Без имени',
    clientEmail: purchasedPackage.user.email,
    title: getTitle(purchasedPackage.titleSnapshot),
    status: purchasedPackage.status,
    totalMinutes: purchasedPackage.totalMinutes,
    remainingMinutes: purchasedPackage.remainingMinutes,
    purchasedAt: purchasedPackage.purchasedAt.toLocaleDateString('ru-RU')
  }));
  const monthIncome = monthTransactions
    .filter(transaction => transaction.amount.greaterThan(0))
    .reduce((total, transaction) => total + transaction.amount.toNumber(), 0);
  const monthExpenses = monthTransactions
    .filter(transaction => transaction.amount.lessThan(0))
    .reduce((total, transaction) => total + Math.abs(transaction.amount.toNumber()), 0);
  const totalClientBalance = clients.reduce(
    (total, client) => total + client.balance.toNumber(),
    0
  );
  const paymentIds = Array.from(
    new Set(history.flatMap(item => (item.paymentId ? [item.paymentId] : [])))
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Платежи</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Единый EUR-ledger клиентов, возвраты, ручные корректировки и пакетные минуты.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PaymentsSyncButton paymentIds={paymentIds} />
          <BalanceAdjustmentButton clients={clientOptions} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Приходы за месяц</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600">+{monthIncome.toFixed(2)} EUR</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Расходы и возвраты</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-rose-600">−{monthExpenses.toFixed(2)} EUR</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">На счетах клиентов</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalClientBalance.toFixed(2)} EUR</p>
          </CardContent>
        </Card>
      </div>

      <ConsultationRateCard initialAmount={rate?.amount.toFixed(2) ?? '0.00'} />

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">
            <WalletCards />
            Транзакции
          </TabsTrigger>
          <TabsTrigger value="packages">
            <PackageOpen />
            Купленные пакеты
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle>История операций</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <FinancialHistoryTable
                items={history}
                storageKey="admin-payments-financial-filters:v1"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/payments/packages">
                <Settings2 />
                Настроить предложения
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
          <PurchasedPackagesTable items={packageItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPaymentsPage;
