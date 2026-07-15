'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface MyStatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'accent';
  href?: string;
  isEditing?: boolean;
}

export const MyStatCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = 'default',
  href,
  isEditing
}: MyStatCardProps) => {
  const iconClassName =
    tone === 'accent'
      ? 'bg-primary text-primary-foreground shadow-inner'
      : 'bg-primary/10 text-primary';

  const CardWrapper = href && !isEditing ? Link : 'div';

  return (
    <CardWrapper
      href={href || '#'}
      className={cn(
        'block shadow-sm h-full rounded-xl overflow-hidden border border-border/60 transition-all duration-300',
        tone === 'accent' && 'bg-gradient-to-br from-primary/5 via-card to-card border-primary/20',
        !isEditing && href && 'hover:-translate-y-1 hover:shadow-md hover:border-primary/40 group',
        isEditing && 'cursor-default'
      )}
    >
      <Card className="h-full border-0 bg-transparent shadow-none">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            {title}
          </CardTitle>
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl shrink-0 transition-transform',
              iconClassName,
              !isEditing && href && 'group-hover:scale-110'
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/90">{description}</p>
        </CardContent>
      </Card>
    </CardWrapper>
  );
};
