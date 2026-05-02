import { Loader2, Pill } from 'lucide-react';

import { cn } from '@/lib/utils';

interface PilloLoaderProps {
  className?: string;
  description?: string;
  title: string;
}

/**
 * Единый loader для экрана и переходов Pillo.
 * @param props - текст и дополнительные классы контейнера.
 * @returns Центрированный индикатор загрузки.
 */
export const PilloLoader = ({ className, description, title }: PilloLoaderProps) => {
  return (
    <div
      className={cn(
        'flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_38%),hsl(var(--background))] px-6 py-10',
        className
      )}
    >
      <div className="w-full max-w-sm rounded-[2rem] border border-white/40 bg-white/70 p-8 text-center shadow-2xl shadow-primary/10 backdrop-blur-xl dark:border-white/10 dark:bg-black/30">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-primary/10 text-primary shadow-inner">
          <Pill className="h-8 w-8" />
        </div>
        <div className="mt-6 flex items-center justify-center gap-3 text-primary">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-base font-semibold tracking-tight">{title}</p>
        </div>
        {description ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
};
