'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { formatPaymentAmount } from '@/modules/payments';
import { useCallback } from 'react';

interface AdminPaymentsLineChartProps {
  currency: string;
  data: Array<{
    monthKey: string;
    monthLabel: string;
    total: number;
  }>;
}

/**
 * Линейный график ежемесячных оплат для админского дашборда.
 */
export const AdminPaymentsLineChart = ({ currency, data }: AdminPaymentsLineChartProps) => {
  const formatTooltipValue = useCallback(
    (value: any) => formatPaymentAmount(Number(value), currency),
    [currency]
  );
  const formatTooltipLabel = useCallback((label: any) => `Месяц: ${label}`, []);
  const formatYAxisTick = useCallback((value: any) => `${Math.round(Number(value))}`, []);

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: 12, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="monthLabel"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickFormatter={formatYAxisTick}
          />
          <Tooltip
            formatter={formatTooltipValue}
            labelFormatter={formatTooltipLabel}
            contentStyle={{
              borderRadius: '0.75rem',
              border: '1px solid hsl(var(--border))',
              backgroundColor: 'hsl(var(--background))'
            }}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="hsl(var(--chart-1))"
            strokeWidth={3}
            dot={{ r: 4, fill: 'hsl(var(--chart-1))' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
