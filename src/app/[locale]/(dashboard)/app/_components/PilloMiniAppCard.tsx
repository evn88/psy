'use client';

import { ChevronRight, Pill } from 'lucide-react';
import { useTransition } from 'react';

import { useRouter } from '@/i18n/navigation';
import { PilloLoader } from '../pillo/_components/PilloLoader';

interface PilloMiniAppCardProps {
  description: string;
  loadingDescription: string;
  loadingTitle: string;
  title: string;
}

/**
 * Клиентская карточка входа в Pillo с мгновенным loader при переходе.
 * @param props - заголовок и описание приложения.
 * @returns Карточка запуска Pillo.
 */
export const PilloMiniAppCard = ({
  description,
  loadingDescription,
  loadingTitle,
  title
}: PilloMiniAppCardProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    startTransition(() => {
      router.push('/app/pillo');
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={isPending}
        aria-busy={isPending}
        className="group block w-full rounded-[2.25rem] text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none"
      >
        <div className="relative overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/40 p-6 shadow-2xl shadow-primary/5 transition-all active:scale-[0.97] dark:border-white/10 dark:bg-white/5">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

          <div className="relative flex items-center gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-foreground p-4 text-background shadow-xl ring-4 ring-background/50 transition-transform group-hover:scale-105">
              <Pill className="h-full w-full" />
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground/80">
                {description}
              </p>
            </div>
          </div>
        </div>
      </button>

      {isPending ? (
        <div className="fixed inset-0 z-50">
          <PilloLoader title={loadingTitle} description={loadingDescription} />
        </div>
      ) : null}
    </>
  );
};
