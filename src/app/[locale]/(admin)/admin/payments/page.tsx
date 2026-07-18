import { endOfMonth, startOfMonth } from 'date-fns';
import { Prisma, type Payment } from '@prisma/client';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import prisma from '@/lib/prisma';
import { formatPaymentAmount } from '@/modules/payments';
import { AdminPaymentsTable } from '@/modules/payments/components/admin-payments-table';
import { PaymentsSyncButton } from '@/modules/payments/components/payments-sync-button';
import { getInstalledPaymentConnectorMetadata } from '@/modules/payments/connectors/registry.server';
import type { PaymentConnectorMetadata } from '@/modules/payments/connectors/types';

const PAGE_SIZE = 50;
const SUCCESSFUL_STATUSES = ['COMPLETED', 'PARTIALLY_REFUNDED'];

interface AdminPaymentsPageProps {
  searchParams: Promise<{
    page?: string;
    provider?: string;
    query?: string;
    status?: string;
  }>;
}

type AdminPaymentRecord = Pick<
  Payment,
  | 'amount'
  | 'captureId'
  | 'capturedAt'
  | 'createdAt'
  | 'currency'
  | 'id'
  | 'lastSyncedAt'
  | 'orderId'
  | 'provider'
  | 'status'
> & {
  user: {
    email: string;
    id: string;
    name: string | null;
  };
};

interface PaymentStatusCount {
  status: string;
  _count: { _all: number };
}

interface PaymentCurrencyTotal {
  currency: string;
  _sum: { amount: Prisma.Decimal | null };
}

/**
 * Реестр платежей с серверной пагинацией, фильтрами и корректными суммами по валютам.
 */
const AdminPaymentsPage = async ({ searchParams }: AdminPaymentsPageProps) => {
  const params = await searchParams;
  const page = Math.max(Number.parseInt(params.page ?? '1', 10) || 1, 1);
  const query = params.query?.trim() ?? '';
  const provider = params.provider?.trim() ?? '';
  const status = params.status?.trim() ?? '';
  const where: Prisma.PaymentWhereInput = {
    ...(provider ? { provider } : {}),
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            { orderId: { contains: query, mode: 'insensitive' } },
            { captureId: { contains: query, mode: 'insensitive' } },
            { user: { name: { contains: query, mode: 'insensitive' } } },
            { user: { email: { contains: query, mode: 'insensitive' } } }
          ]
        }
      : {})
  };
  const now = new Date();
  const monthRange = {
    gte: startOfMonth(now),
    lte: endOfMonth(now)
  };

  const providers: PaymentConnectorMetadata[] = getInstalledPaymentConnectorMetadata();
  const [payments, totalCount, monthTotals, statusCounts] = await Promise.all([
    prisma.payment.findMany({
      where,
      select: {
        id: true,
        provider: true,
        orderId: true,
        captureId: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
        capturedAt: true,
        lastSyncedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.payment.count({ where }),
    prisma.payment.groupBy({
      by: ['currency'],
      where: {
        status: { in: SUCCESSFUL_STATUSES },
        capturedAt: monthRange
      },
      _sum: { amount: true }
    }),
    prisma.payment.groupBy({
      by: ['status'],
      _count: { _all: true }
    })
  ]);
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const counts = new Map<string, number>(
    (statusCounts as PaymentStatusCount[]).map(item => [item.status, item._count._all])
  );
  const successfulCount = SUCCESSFUL_STATUSES.reduce(
    (total, paymentStatus) => total + (counts.get(paymentStatus) ?? 0),
    0
  );
  const pendingCount = counts.get('PENDING') ?? 0;
  const refundedCount = [...counts.entries()].reduce(
    (total, [paymentStatus, count]) =>
      paymentStatus.includes('REFUND') || paymentStatus === 'REVERSED' ? total + count : total,
    0
  );
  const tableItems = (payments as AdminPaymentRecord[]).map(payment => ({
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
  const createPageHref = (targetPage: number) => {
    const nextParams = new URLSearchParams();
    if (query) nextParams.set('query', query);
    if (provider) nextParams.set('provider', provider);
    if (status) nextParams.set('status', status);
    nextParams.set('page', String(targetPage));
    return `/admin/payments?${nextParams.toString()}`;
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Платежи</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Операции всех подключённых провайдеров. Суммы не смешиваются между валютами.
          </p>
        </div>
        <PaymentsSyncButton
          paymentIds={(payments as AdminPaymentRecord[]).map(payment => payment.id)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Получено за месяц</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {monthTotals.length > 0 ? (
              (monthTotals as PaymentCurrencyTotal[]).map(total => (
                <p key={total.currency} className="text-xl font-bold">
                  {formatPaymentAmount(total._sum.amount ?? 0, total.currency)}
                </p>
              ))
            ) : (
              <p className="text-xl font-bold">Нет поступлений</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Состояние операций</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Успешные: {successfulCount}</p>
            <p className="mt-1 text-muted-foreground">В ожидании: {pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Возвраты и откаты</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{refundedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="space-y-4 border-b">
          <CardTitle>Все операции</CardTitle>
          <form className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="query"
                defaultValue={query}
                placeholder="Клиент или номер операции"
                className="pl-9"
              />
            </div>
            <select
              name="provider"
              defaultValue={provider}
              className="h-10 rounded-md border bg-background px-3 text-sm"
              aria-label="Провайдер"
            >
              <option value="">Все провайдеры</option>
              {providers.map(item => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={status}
              className="h-10 rounded-md border bg-background px-3 text-sm"
              aria-label="Статус"
            >
              <option value="">Все статусы</option>
              {[...counts.keys()].sort().map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Button type="submit">Применить</Button>
          </form>
        </CardHeader>
        <CardContent className="min-w-0 pt-6">
          <AdminPaymentsTable payments={tableItems} />
          <div className="mt-5 flex items-center justify-between gap-4 text-sm">
            <p className="text-muted-foreground">
              Страница {page} из {totalPages}, операций: {totalCount}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={createPageHref(page - 1)}>
                    <ArrowLeft className="size-4" />
                    Назад
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ArrowLeft className="size-4" />
                  Назад
                </Button>
              )}
              {page < totalPages ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={createPageHref(page + 1)}>
                    Вперёд
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Вперёд
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPaymentsPage;
