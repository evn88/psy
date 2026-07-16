'use client';

import { useTranslations } from 'next-intl';
import { CreditCard, AlertTriangle, ChevronRight } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { AdminPaymentsLineChart } from '../admin-payments-line-chart';
import { formatPaymentAmount } from '@/modules/payments';
import { DashboardWidget, DashboardWidgetHeader } from '@/components/dashboard/dashboard-widget';

export const PaymentsOverviewWidget: WidgetComponentType = ({ data, isEditing, isOverlay }) => {
  const t = useTranslations('Admin');

  if (!data) return <div className="h-full min-h-80 animate-pulse rounded-xl bg-muted/30" />;

  const monthlyTotal = formatPaymentAmount(
    data.periodPaymentsTotal ?? 0,
    data.paymentsCurrency ?? ''
  );
  const disputesCount = data.paymentDisputesCount ?? 0;

  return (
    <DashboardWidget>
      <DashboardWidgetHeader
        title={t('paymentsOverviewTitle')}
        icon={CreditCard}
        action={
          !isEditing ? (
            <Link
              href="/admin/payments"
              className="flex min-h-11 items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Все платежи
              <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          ) : null
        }
      />

      <CardContent className="flex-1 p-0 flex flex-col lg:flex-row">
        <div className="relative min-h-64 flex-1 p-4 lg:border-r lg:border-border/50">
          {isOverlay ? (
            <div className="h-full min-h-64 animate-pulse rounded-lg bg-muted/30" />
          ) : (
            <AdminPaymentsLineChart
              currency={data.paymentsCurrency ?? ''}
              data={data.paymentsPeriodSeries ?? []}
            />
          )}
        </div>

        <div className="flex w-full flex-row divide-x divide-border/50 border-t border-border/50 lg:w-1/3 lg:flex-col lg:divide-x-0 lg:divide-y lg:border-l-0 lg:border-t-0">
          <div className="flex-1 p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span className="text-xs font-medium">{t('monthlyPaymentsTitle')}</span>
            </div>
            <div className="truncate text-2xl font-semibold tracking-tight text-foreground">
              {monthlyTotal}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground/80 mt-1">
              {t('monthlyPaymentsDesc')}
            </div>
          </div>

          <div
            className={cn(
              'flex-1 p-5 flex flex-col justify-center transition-colors',
              disputesCount > 0 ? 'bg-destructive/5' : ''
            )}
          >
            <div
              className={cn(
                'flex items-center gap-2 mb-2',
                disputesCount > 0 ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">{t('paymentDisputesTitle')}</span>
            </div>
            <div
              className={cn(
                'truncate text-2xl font-semibold tracking-tight',
                disputesCount > 0 ? 'text-destructive' : 'text-foreground'
              )}
            >
              {disputesCount}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground/80 mt-1">
              {t('paymentDisputesDesc')}
            </div>
          </div>
        </div>
      </CardContent>
    </DashboardWidget>
  );
};

PaymentsOverviewWidget.defaultClassName = 'col-span-1 sm:col-span-2 lg:col-span-3 row-span-2';
