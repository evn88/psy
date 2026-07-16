'use client';

import { useTranslations } from 'next-intl';
import { ClipboardList, CalendarDays, CreditCard, FileText, ArrowRight } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import type { ComponentType } from 'react';
import { DashboardWidget, DashboardWidgetHeader } from '@/components/dashboard/dashboard-widget';

interface ActionButtonProps {
  href: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  isEditing?: boolean;
}

const ActionButton = ({ href, title, description, icon: Icon, isEditing }: ActionButtonProps) => (
  <Link
    href={href}
    aria-disabled={isEditing}
    tabIndex={isEditing ? -1 : undefined}
    className={cn(
      'group flex min-h-20 w-full items-center gap-3 rounded-lg border border-border/60 p-3.5 transition-[border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      !isEditing && 'hover:border-primary/30 hover:bg-muted/30',
      isEditing && 'pointer-events-none opacity-60'
    )}
  >
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-200 group-hover:text-primary">
      <Icon className="h-5 w-5" />
    </span>
    <span className="min-w-0 flex-1 text-left">
      <span className="block text-sm font-bold text-foreground/90">{title}</span>
      <span className="mt-0.5 block text-xs font-normal leading-relaxed text-muted-foreground/80">
        {description}
      </span>
    </span>
    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
  </Link>
);

export const NextStepsWidget: WidgetComponentType = ({ isEditing }) => {
  const t = useTranslations('My');

  return (
    <DashboardWidget>
      <DashboardWidgetHeader title={t('nextStepsTitle')} />
      <CardContent className="grid flex-1 gap-3 p-5 sm:grid-cols-2">
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
    </DashboardWidget>
  );
};
NextStepsWidget.defaultClassName = 'sm:col-span-2 lg:col-span-2';
