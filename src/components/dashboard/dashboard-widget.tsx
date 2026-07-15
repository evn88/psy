import type { ComponentProps, ComponentType, ReactNode } from 'react';
import Link from 'next/link';

import { ArrowUpRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type DashboardWidgetTone = 'default' | 'accent' | 'warning';

interface DashboardWidgetProps extends ComponentProps<typeof Card> {
  children: ReactNode;
}

export const DashboardWidget = ({ className, children, ...props }: DashboardWidgetProps) => (
  <Card
    className={cn(
      'flex h-full flex-col overflow-hidden border-border/60 bg-card shadow-sm',
      className
    )}
    {...props}
  >
    {children}
  </Card>
);

interface DashboardWidgetHeaderProps {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
}

export const DashboardWidgetHeader = ({
  title,
  icon: Icon,
  action
}: DashboardWidgetHeaderProps) => (
  <CardHeader className="flex min-h-14 flex-row items-center justify-between gap-3 space-y-0 border-b border-border/50 px-5 py-3.5">
    <div className="flex min-w-0 items-center gap-2.5">
      {Icon ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
      ) : null}
      <CardTitle className="truncate text-sm font-semibold leading-5 text-foreground">
        {title}
      </CardTitle>
    </div>
    {action}
  </CardHeader>
);

interface DashboardStatWidgetProps {
  title: string;
  value: string | number;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone?: DashboardWidgetTone;
  href?: string;
  isEditing?: boolean;
}

export const DashboardStatWidget = ({
  title,
  value,
  description,
  icon: Icon,
  tone = 'default',
  href,
  isEditing
}: DashboardStatWidgetProps) => {
  const isInteractive = Boolean(href && !isEditing);
  const content = (
    <DashboardWidget
      className={cn(
        'transition-[border-color,background-color,box-shadow] duration-200',
        isInteractive &&
          'group-hover:border-primary/35 group-hover:bg-muted/20 group-hover:shadow-md group-focus-visible:border-primary/50 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2',
        tone === 'warning' && 'border-destructive/25'
      )}
    >
      <CardContent className="flex h-full min-h-40 flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-5 text-muted-foreground">{title}</p>
            <p
              className={cn(
                'mt-3 truncate text-3xl font-semibold tracking-tight text-foreground',
                tone === 'warning' && 'text-destructive'
              )}
            >
              {value}
            </p>
          </div>
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground',
              tone === 'accent' && 'bg-primary/12 text-primary',
              tone === 'warning' && 'bg-destructive/10 text-destructive'
            )}
          >
            <Icon className="size-5" />
          </span>
        </div>
        <div className="mt-5 flex items-end justify-between gap-3">
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
          {isInteractive ? (
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors duration-200 group-hover:text-primary" />
          ) : null}
        </div>
      </CardContent>
    </DashboardWidget>
  );

  return isInteractive && href ? (
    <Link href={href} className="group block h-full rounded-xl focus-visible:outline-none">
      {content}
    </Link>
  ) : (
    content
  );
};
