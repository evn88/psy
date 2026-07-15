'use client';

import { useTranslations } from 'next-intl';
import { UserRound } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';

export const AccountOverviewWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');

  return (
    <Card className="border border-border/50 shadow-sm rounded-xl overflow-hidden h-full flex flex-col">
      <CardHeader className="border-b bg-muted/5 pb-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
          {t('accountOverviewTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-muted/10 p-3 shadow-inner">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
              {t('profileLabel')}
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground/90 truncate">
              {data?.userName || data?.userEmail || '-'}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/10 p-3 shadow-inner">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
              {t('timezoneLabel')}
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground/90">
              {data?.userTimezone || '-'}
            </div>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          disabled={isEditing}
          className="w-full h-10 rounded-xl font-semibold shadow-sm hover:bg-background pointer-events-auto"
        >
          <Link href="/my/profile">
            <UserRound className="h-4 w-4 mr-2 text-muted-foreground/70" />
            {t('editProfile')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
