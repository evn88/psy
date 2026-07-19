import {
  BalanceAdjustmentButton,
  PurchasedPackagesTable,
  type FinancialClientOption,
  type PurchasedPackageItem
} from '../../../payments/_components/financial-controls';
import type { Prisma } from '@prisma/client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import prisma from '@/lib/prisma';
import {
  FinancialHistoryTable,
  type FinancialHistoryItem
} from '@/modules/payments/financial/financial-history-table';
import { getFinancialHistory } from '@/modules/payments/financial/financial-history.server';
import { PaymentsSyncButton } from '@/modules/payments/components/payments-sync-button';

interface ClientPaymentsProps {
  clientId: string;
}

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
 * Финансовая карточка клиента с балансом, ledger и управлением пакетами.
 */
export const ClientPayments = async ({ clientId }: ClientPaymentsProps) => {
  const [clientResult, historyResult, purchasedPackagesResult] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: clientId },
      select: { balance: true, email: true, id: true, name: true }
    }),
    getFinancialHistory({ userId: clientId, take: 500 }),
    prisma.purchasedPackage.findMany({
      where: { userId: clientId },
      include: {
        user: { select: { email: true, name: true } }
      },
      orderBy: { purchasedAt: 'desc' }
    })
  ]);
  type ClientRecord = Prisma.UserGetPayload<{
    select: { balance: true; email: true; id: true; name: true };
  }>;
  type PurchasedPackageRecord = Prisma.PurchasedPackageGetPayload<{
    include: { user: { select: { email: true; name: true } } };
  }>;
  const client = clientResult as ClientRecord;
  const history = historyResult as FinancialHistoryItem[];
  const purchasedPackages = purchasedPackagesResult as PurchasedPackageRecord[];
  const clientOptions: FinancialClientOption[] = [
    {
      id: client.id,
      name: client.name || 'Без имени',
      email: client.email,
      balance: client.balance.toFixed(2)
    }
  ];
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
  const paymentIds = Array.from(
    new Set(history.flatMap(item => (item.paymentId ? [item.paymentId] : [])))
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardDescription>Текущий денежный баланс</CardDescription>
            <CardTitle className="mt-1 text-3xl">{client.balance.toFixed(2)} EUR</CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <PaymentsSyncButton paymentIds={paymentIds} userId={clientId} />
            <BalanceAdjustmentButton clients={clientOptions} defaultClientId={clientId} />
          </div>
        </CardHeader>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle className="text-xl">История платежей и списаний</CardTitle>
          <CardDescription>
            В строке оставлены сумма, статус, ID, Order ID и дата. Возврат и проверка ошибочной
            записи открываются по нажатию. Для пополнения доступен полный или частичный возврат на
            исходный способ оплаты.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 pt-6">
          <FinancialHistoryTable
            items={history}
            storageKey="admin-client-payments-financial-filters:v1"
            showClient={false}
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle className="text-xl">Купленные пакеты</CardTitle>
          <CardDescription>Остатки минут и компенсирующие корректировки.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <PurchasedPackagesTable items={packageItems} />
        </CardContent>
      </Card>
    </div>
  );
};
