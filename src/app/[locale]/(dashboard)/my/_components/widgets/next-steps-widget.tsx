'use client';

import { useTranslations } from 'next-intl';
import { ClipboardList, CalendarDays, CreditCard, FileText, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';

const ActionButton = ({ href, title, description, icon: Icon, isEditing }: any) => (
  <Button
    asChild
    variant="outline"
    disabled={isEditing}
    className={cn(
      'group h-auto w-full justify-between whitespace-normal p-4 rounded-xl border-border/60 transition-all duration-300 hover:border-primary/30 hover:bg-primary/5',
      !isEditing && 'hover:-translate-y-1 hover:shadow-md pointer-events-auto'
    )}
  >
    <Link href={href} className="flex w-full items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-105">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-bold text-foreground/90">{title}</span>
        <span className="mt-0.5 block text-xs font-normal leading-relaxed text-muted-foreground/80">
          {description}
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-1" />
    </Link>
  </Button>
);

export const NextStepsWidget: WidgetComponentType = ({ isEditing }) => {
  const t = useTranslations('My');

  return (
    <Card className="border border-border/50 shadow-sm rounded-xl overflow-hidden h-full flex flex-col">
      <CardHeader className="border-b bg-muted/5 pb-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
          {t('nextStepsTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 p-5 sm:p-6 flex-1">
        <ActionButton
          href="/my/surveys"
          title={t('actionSurveysTitle')}
          description={t('actionSurveysDesc')}
          icon={ClipboardList}
          isEditing={isEditing}
        />
        <ActionButton
          href="/my/sessions"
          title={t('actionSessionsTitle')}
          description={t('actionSessionsDesc')}
          icon={CalendarDays}
          isEditing={isEditing}
        />
        <ActionButton
          href="/my/payments"
          title={t('actionPaymentsTitle')}
          description={t('actionPaymentsDesc')}
          icon={CreditCard}
          isEditing={isEditing}
        />
        <ActionButton
          href="/my/data"
          title={t('actionDataTitle')}
          description={t('actionDataDesc')}
          icon={FileText}
          isEditing={isEditing}
        />
      </CardContent>
    </Card>
  );
};
NextStepsWidget.defaultClassName = 'sm:col-span-2 lg:col-span-2';
