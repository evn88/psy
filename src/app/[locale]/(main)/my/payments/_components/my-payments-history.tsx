import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  RefreshCcw,
  Sparkles,
  TriangleAlert,
  type LucideIcon
} from 'lucide-react';

import { PaymentStatusBadge } from '@/components/payments/payment-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

interface MyPaymentHistoryItem {
  id: string;
  amountLabel: string;
  status: string;
  orderId: string;
  createdAtLabel: string;
  capturedAtLabel: string;
}

interface MyPaymentsHistoryProps {
  payments: MyPaymentHistoryItem[];
}

type PaymentHistoryGroup = 'successful' | 'processing' | 'refunded' | 'problematic';

interface PaymentHistoryEmptyStateProps {
  ctaLabel: string;
  description: string;
  icon: LucideIcon;
  title: string;
}

interface PaymentHistoryTableProps {
  payments: MyPaymentHistoryItem[];
}

const SUCCESSFUL_PAYMENT_STATUSES = new Set(['COMPLETED', 'PARTIALLY_REFUNDED']);
const PROCESSING_PAYMENT_STATUSES = new Set(['CREATED', 'SAVED', 'APPROVED', 'PENDING']);
const REFUNDED_PAYMENT_STATUSES = new Set(['REFUNDED', 'REVERSED']);

/**
 * Определяет группу истории для статуса платежа.
 * @param status - Статус платежа из базы.
 * @returns Ключ фильтра для вкладок истории.
 */
const getPaymentHistoryGroup = (status: string): PaymentHistoryGroup => {
  const normalizedStatus = status.toUpperCase();

  if (SUCCESSFUL_PAYMENT_STATUSES.has(normalizedStatus)) {
    return 'successful';
  }

  if (PROCESSING_PAYMENT_STATUSES.has(normalizedStatus)) {
    return 'processing';
  }

  if (REFUNDED_PAYMENT_STATUSES.has(normalizedStatus)) {
    return 'refunded';
  }

  return 'problematic';
};

/**
 * Пустое состояние для вкладок истории платежей.
 * @param props - Заголовок, описание и CTA для пустого состояния.
 * @returns Карточка с пояснением и кнопкой перехода к оплате.
 */
const PaymentHistoryEmptyState = ({
  ctaLabel,
  description,
  icon: Icon,
  title
}: PaymentHistoryEmptyStateProps) => {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/10 px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      <Button asChild variant="outline" className="mt-6">
        <a href="#payment-checkout">
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
};

/**
 * Таблица платежей с современным компактным оформлением.
 * @param props - Отфильтрованный список платежей.
 * @returns Табличный блок истории платежей.
 */
const PaymentHistoryTable = ({ payments }: PaymentHistoryTableProps) => {
  return (
    <div className="overflow-hidden rounded-3xl border bg-card/80 shadow-sm">
      <Table className="min-w-[820px]">
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-11 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Сумма
            </TableHead>
            <TableHead className="h-11 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Статус
            </TableHead>
            <TableHead className="h-11 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Order ID
            </TableHead>
            <TableHead className="h-11 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Создан
            </TableHead>
            <TableHead className="h-11 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Оплачен
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map(payment => (
            <TableRow key={payment.id} className="hover:bg-muted/30">
              <TableCell className="px-3 py-4 text-sm font-semibold">
                {payment.amountLabel}
              </TableCell>
              <TableCell className="px-3 py-4">
                <PaymentStatusBadge status={payment.status} />
              </TableCell>
              <TableCell className="px-3 py-4 font-mono text-xs text-muted-foreground">
                <span className="block max-w-[260px] break-all" title={payment.orderId}>
                  {payment.orderId}
                </span>
              </TableCell>
              <TableCell className="px-3 py-4 text-sm text-muted-foreground">
                {payment.createdAtLabel}
              </TableCell>
              <TableCell className="px-3 py-4 text-sm text-muted-foreground">
                {payment.capturedAtLabel}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

/**
 * История платежей пользователя в личном кабинете.
 */
export const MyPaymentsHistory = ({ payments }: MyPaymentsHistoryProps) => {
  const groupedPayments = payments.reduce<Record<PaymentHistoryGroup, MyPaymentHistoryItem[]>>(
    (accumulator, payment) => {
      const group = getPaymentHistoryGroup(payment.status);
      accumulator[group].push(payment);

      return accumulator;
    },
    {
      successful: [],
      processing: [],
      refunded: [],
      problematic: []
    }
  );

  const paymentTabs = [
    {
      ctaLabel: 'Перейти к оплате',
      description: 'Здесь появятся все операции после capture и последующей синхронизации.',
      icon: Sparkles,
      items: payments,
      title: 'Платежей пока нет',
      value: 'all'
    },
    {
      ctaLabel: 'Перейти к оплате',
      description: 'В этой вкладке отображаются завершённые платежи и частичные возвраты.',
      icon: BadgeCheck,
      items: groupedPayments.successful,
      title: 'Пока нет завершённых оплат',
      value: 'successful'
    },
    {
      ctaLabel: 'Перейти к оплате',
      description: 'Сюда попадают платежи, которые ещё проходят проверку или ожидают capture.',
      icon: Clock3,
      items: groupedPayments.processing,
      title: 'Нет платежей в обработке',
      value: 'processing'
    },
    {
      ctaLabel: 'Перейти к оплате',
      description:
        'Возвраты и откаты собраны отдельно, чтобы быстрее отслеживать спорные операции.',
      icon: RefreshCcw,
      items: groupedPayments.refunded,
      title: 'Возвратов пока нет',
      value: 'refunded'
    },
    {
      ctaLabel: 'Перейти к оплате',
      description: 'Проблемные операции отделены в отдельную вкладку для быстрой проверки.',
      icon: TriangleAlert,
      items: groupedPayments.problematic,
      title: 'Ошибок и отмен пока нет',
      value: 'problematic'
    }
  ] as const;

  return (
    <Card id="payment-history" className="overflow-hidden border-border/70 shadow-sm">
      <CardHeader className="space-y-1 border-b border-border/60">
        <CardTitle className="text-2xl">История платежей</CardTitle>
        <CardDescription className="max-w-2xl">
          Здесь появляются операции после capture и последующей синхронизации webhook. При
          необходимости список можно быстро отфильтровать по статусу.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <Tabs defaultValue="all" className="space-y-5">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
            {paymentTabs.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm font-medium shadow-none transition-colors data-[state=active]:border-foreground/20 data-[state=active]:bg-muted data-[state=active]:text-foreground"
              >
                {tab.value === 'all'
                  ? 'Все'
                  : tab.value === 'successful'
                    ? 'Успешные'
                    : tab.value === 'processing'
                      ? 'В обработке'
                      : tab.value === 'refunded'
                        ? 'Возвраты'
                        : 'Проблемные'}
                <span className="ml-2 text-xs text-muted-foreground">{tab.items.length}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {paymentTabs.map(tab => {
            const TabIcon = tab.icon;

            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-0">
                {tab.items.length > 0 ? (
                  <PaymentHistoryTable payments={tab.items} />
                ) : (
                  <PaymentHistoryEmptyState
                    ctaLabel={tab.ctaLabel}
                    description={tab.description}
                    icon={TabIcon}
                    title={tab.title}
                  />
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};
