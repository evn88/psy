'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'accent' | 'warning';
  href?: string;
  isEditing?: boolean;
}

export const AdminStatCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = 'default',
  href,
  isEditing
}: AdminStatCardProps) => {
  const iconClassName =
    tone === 'accent'
      ? 'bg-primary text-primary-foreground shadow-inner'
      : tone === 'warning'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-muted text-muted-foreground';

  const CardWrapper = href && !isEditing ? Link : 'div';

  return (
    <CardWrapper
      href={href || '#'}
      className={cn(
        'block h-full transition-all duration-300',
        !isEditing && href && 'hover:-translate-y-1 hover:shadow-md group',
        isEditing && 'cursor-default'
      )}
    >
      <Card className="h-full shadow-sm transition-colors group-hover:border-primary/40">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            {title}
          </CardTitle>
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl transition-transform',
              iconClassName,
              !isEditing && href && 'group-hover:scale-110'
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </CardWrapper>
  );
};
