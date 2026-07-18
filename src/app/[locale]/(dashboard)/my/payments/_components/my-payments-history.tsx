import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  RefreshCcw,
  Sparkles,
  TriangleAlert,
  type LucideIcon
} from 'lucide-react';

import { PaymentStatusBadge } from '@/modules/payments/components/payment-status-badge';
import { getPaymentStatusGroup, type PaymentStatusGroup } from '@/modules/payments';
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
  providerLabel: string;
  createdAtLabel: string;
  capturedAtLabel: string;
}

interface MyPaymentsHistoryProps {
  payments: MyPaymentHistoryItem[];
}

interface PaymentHistoryEmptyStateProps {
  ctaLabel: string;
  description: string;
  icon: LucideIcon;
  title: string;
}

interface PaymentHistoryTableProps {
  payments: MyPaymentHistoryItem[];
}

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
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/5 px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-4 text-sm font-bold text-foreground/90">{title}</h3>
      <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground/80">
        {description}
      </p>
      <Button
        asChild
        variant="outline"
        className="mt-5 rounded-xl h-10 font-bold border-border/60 hover:bg-muted/10"
      >
        <a href="#payment-checkout">
          {ctaLabel}
          <ArrowRight className="h-4 w-4 ml-1.5" />
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
    <>
      <div className="grid gap-3 md:hidden">
        {payments.map(payment => (
          <article key={payment.id} className="space-y-3 rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{payment.amountLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">{payment.providerLabel}</p>
              </div>
              <PaymentStatusBadge status={payment.status} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Создан</dt>
                <dd className="mt-1">{payment.createdAtLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Подтверждён</dt>
                <dd className="mt-1">{payment.capturedAtLabel}</dd>
              </div>
            </dl>
            {getPaymentStatusGroup(payment.status) === 'problematic' ? (
              <a href="#payment-checkout" className="inline-flex text-sm font-medium text-primary">
                Повторить оплату
              </a>
            ) : null}
          </article>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-2xl border border-border/50 bg-card md:block">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent border-b border-border/40">
              <TableHead className="h-11 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">
                Сумма
              </TableHead>
              <TableHead className="h-11 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">
                Статус
              </TableHead>
              <TableHead className="h-11 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">
                Провайдер
              </TableHead>
              <TableHead className="h-11 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">
                Создан
              </TableHead>
              <TableHead className="h-11 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">
                Оплачен
              </TableHead>
              <TableHead className="h-11 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">
                Действие
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map(payment => (
              <TableRow
                key={payment.id}
                className="hover:bg-primary/5 transition-colors border-b border-border/45"
              >
                <TableCell className="px-4 py-3.5 text-sm font-bold text-foreground/90">
                  {payment.amountLabel}
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <PaymentStatusBadge status={payment.status} />
                </TableCell>
                <TableCell className="px-4 py-3.5 text-xs text-muted-foreground/80">
                  {payment.providerLabel}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-xs text-muted-foreground/80">
                  {payment.createdAtLabel}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-xs text-muted-foreground/80">
                  {payment.capturedAtLabel}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-xs">
                  {getPaymentStatusGroup(payment.status) === 'problematic' ? (
                    <a href="#payment-checkout" className="font-medium text-primary">
                      Повторить
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

/**
 * История платежей пользователя в личном кабинете.
 */
export const MyPaymentsHistory = ({ payments }: MyPaymentsHistoryProps) => {
  const groupedPayments = payments.reduce<Record<PaymentStatusGroup, MyPaymentHistoryItem[]>>(
    (accumulator, payment) => {
      const group = getPaymentStatusGroup(payment.status);
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
      description: 'Здесь появятся подтверждённые и ожидающие операции.',
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
      description: 'Сюда попадают платежи, которые ещё проходят проверку.',
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
    <Card
      id="payment-history"
      className="overflow-hidden border-border/50 bg-card shadow-sm rounded-2xl"
    >
      <CardHeader className="space-y-4 border-b border-border/40 bg-gradient-to-b from-muted/20 to-card p-6 pb-5">
        <CardTitle className="text-lg font-bold">История платежей</CardTitle>
        <CardDescription className="max-w-2xl text-xs leading-relaxed text-muted-foreground/80">
          Следите за состоянием оплат и возвратов. Технические детали скрыты, чтобы история было
          проще читать.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1.5 bg-muted/40 p-1.5 rounded-xl border border-border/40 max-w-fit">
            {paymentTabs.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/40"
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
                <span className="ml-1.5 text-[10px] text-muted-foreground/80 font-bold bg-muted px-1.5 py-0.5 rounded-md">
                  {tab.items.length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {paymentTabs.map(tab => {
            const TabIcon = tab.icon;

            return (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="mt-0 animate-in fade-in duration-200"
              >
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
