'use client';

import { useTranslations } from 'next-intl';
import { Activity, CreditCard, AlertTriangle, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { AdminPaymentsLineChart } from '../admin-payments-line-chart';
import { formatPaymentAmount } from '@/modules/payments';

export const PaymentsOverviewWidget: WidgetComponentType = ({ data, isEditing, isOverlay }) => {
  const t = useTranslations('Admin');

  if (!data)
    return (
      <Card className="h-[300px] flex items-center justify-center">
        <Activity className="animate-spin text-muted-foreground" />
      </Card>
    );

  const monthlyTotal = formatPaymentAmount(data.currentMonthPaymentsTotal, data.paymentsCurrency);
  const disputesCount = data.paymentDisputesCount ?? 0;

  return (
    <Card className="shadow-sm h-full flex flex-col group overflow-hidden border border-border/50">
      <CardHeader className="border-b bg-muted/5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            {t('paymentsOverviewTitle')}
          </CardTitle>
          {!isEditing && (
            <Link
              href="/admin/payments"
              className="flex items-center text-xs font-medium text-primary hover:underline"
            >
              Все платежи
              <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col lg:flex-row">
        {/* Left Side: Chart */}
        <div className="flex-1 p-4 lg:border-r border-border/50 min-h-[250px] relative pointer-events-none">
          {isOverlay ? (
            <div className="w-full h-full flex items-center justify-center bg-muted/10 rounded-lg border border-dashed border-border/50 text-muted-foreground/60">
              <Activity className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <AdminPaymentsLineChart
              currency={data.paymentsCurrency}
              data={data.paymentsYearlySeries}
            />
          )}
        </div>

        {/* Right Side: Stats */}
        <div className="w-full lg:w-1/3 flex flex-row lg:flex-col divide-x lg:divide-x-0 lg:divide-y divide-border/50 border-t lg:border-t-0 border-border/50">
          <div className="flex-1 p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span className="text-xs font-semibold">{t('monthlyPaymentsTitle')}</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground truncate">
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
              <span className="text-xs font-semibold">{t('paymentDisputesTitle')}</span>
            </div>
            <div
              className={cn(
                'text-2xl font-bold tracking-tight truncate',
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
    </Card>
  );
};

PaymentsOverviewWidget.defaultClassName = 'col-span-1 sm:col-span-2 lg:col-span-3 row-span-2';
