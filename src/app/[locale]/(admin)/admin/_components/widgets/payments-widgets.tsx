'use client';

import { useTranslations } from 'next-intl';
import { Activity, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { AdminPaymentsLineChart } from '../admin-payments-line-chart';
import { formatPaymentAmount } from '@/modules/payments';
import { AdminStatCard } from './admin-stat-card';

export const PaymentsChartWidget: WidgetComponentType = ({ data, isEditing, isOverlay }) => {
  const t = useTranslations('Admin');
  if (!data)
    return (
      <Card className="h-[300px] flex items-center justify-center">
        <Activity className="animate-spin text-muted-foreground" />
      </Card>
    );

  const CardWrapper = !isEditing ? Link : 'div';

  return (
    <CardWrapper
      href="/admin/payments"
      className={cn(
        'block h-full transition-all duration-300',
        !isEditing && 'hover:-translate-y-1 hover:shadow-md group'
      )}
    >
      <Card className="shadow-sm h-full flex flex-col group-hover:border-primary/40 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
            {t('paymentsChartTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pointer-events-none">
          {isOverlay ? (
            <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-muted/10 rounded-lg border border-dashed border-border/50 text-muted-foreground/60">
              <Activity className="w-8 h-8" />
            </div>
          ) : (
            <AdminPaymentsLineChart
              currency={data.paymentsCurrency}
              data={data.paymentsYearlySeries}
            />
          )}
        </CardContent>
      </Card>
    </CardWrapper>
  );
};
PaymentsChartWidget.defaultClassName = 'sm:col-span-2 xl:col-span-2 row-span-2';

export const MonthlyPaymentsWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  const value = data
    ? formatPaymentAmount(data.currentMonthPaymentsTotal, data.paymentsCurrency)
    : '-';
  return (
    <AdminStatCard
      title={t('monthlyPaymentsTitle')}
      value={value}
      description={t('monthlyPaymentsDesc')}
      icon={CreditCard}
      tone="accent"
      href="/admin/payments"
      isEditing={isEditing}
    />
  );
};
