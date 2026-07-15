'use client';

import { useTranslations } from 'next-intl';
import { UserRound } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { DashboardWidget, DashboardWidgetHeader } from '@/components/dashboard/dashboard-widget';

export const AccountOverviewWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');

  return (
    <DashboardWidget>
      <DashboardWidgetHeader title={t('accountOverviewTitle')} icon={UserRound} />
      <CardContent className="flex flex-1 flex-col justify-between gap-5 p-5">
        <dl className="divide-y divide-border/50">
          <div className="pb-3">
            <dt className="text-xs font-medium text-muted-foreground">{t('profileLabel')}</dt>
            <dd className="mt-1 truncate text-sm font-semibold text-foreground">
              {data?.userName || data?.userEmail || '-'}
            </dd>
          </div>
          <div className="pt-3">
            <dt className="text-xs font-medium text-muted-foreground">{t('timezoneLabel')}</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">
              {data?.userTimezone || '-'}
            </dd>
          </div>
        </dl>
        <Button
          asChild
          variant="outline"
          disabled={isEditing}
          className="h-11 w-full rounded-lg shadow-none"
        >
          <Link href="/my/profile">
            <UserRound className="h-4 w-4 mr-2 text-muted-foreground/70" />
            {t('editProfile')}
          </Link>
        </Button>
      </CardContent>
    </DashboardWidget>
  );
};
