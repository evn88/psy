import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Download, Home, Menu, ShieldCheck, Smartphone, User } from 'lucide-react';

import { requirePilloUser } from '@/modules/pillo/access';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/DropdownMenu';
import { PilloMiniAppCard } from './_components/PilloMiniAppCard';

export const metadata: Metadata = {
  title: 'Mini Apps',
  robots: {
    index: false,
    follow: false
  }
};

/**
 * Компактная карточка инструкции установки PWA.
 */
const InstallInstructionCard = ({
  icon: Icon,
  steps,
  title
}: {
  icon: typeof Smartphone;
  steps: string[];
  title: string;
}) => {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/40 bg-white/30 p-5 backdrop-blur-md transition-colors hover:bg-white/50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-bold tracking-tight">{title}</h3>
      </div>
      <ul className="space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
              {index + 1}
            </span>
            <span className="leading-tight">{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Страница меню мини-приложений.
 */
const MiniAppsPage = async () => {
  const user = await requirePilloUser();
  const t = await getTranslations('MiniApps');
  const pilloT = await getTranslations('Pillo');
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-background px-4 py-8 md:py-12">
      {/* Динамичный градиентный фон */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute -right-[10%] bottom-[10%] h-[40%] w-[40%] rounded-full bg-accent/15 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl space-y-12">
        <header className="flex items-start justify-between gap-8 px-1">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {t('title')}
            </h1>
            <p className="max-w-[260px] text-sm font-medium leading-relaxed text-muted-foreground/70 sm:max-w-md sm:text-base">
              {t('description')}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-white/40 bg-white/40 p-0 shadow-xl shadow-black/5 backdrop-blur-xl transition-all hover:bg-white/60 active:scale-90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">{t('nav.menu')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 rounded-[1.5rem] p-2 backdrop-blur-2xl"
            >
              <Link href="/">
                <DropdownMenuItem className="cursor-pointer rounded-xl py-3.5 text-base">
                  <Home className="mr-3 h-5 w-5 text-muted-foreground" />
                  {t('nav.home')}
                </DropdownMenuItem>
              </Link>
              <Link href="/my">
                <DropdownMenuItem className="cursor-pointer rounded-xl py-3.5 text-base">
                  <User className="mr-3 h-5 w-5 text-muted-foreground" />
                  {t('nav.profile')}
                </DropdownMenuItem>
              </Link>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator className="my-1 opacity-50" />
                  <Link href="/admin">
                    <DropdownMenuItem className="cursor-pointer rounded-xl py-3.5 text-base font-semibold text-primary">
                      <ShieldCheck className="mr-3 h-5 w-5" />
                      {t('nav.admin')}
                    </DropdownMenuItem>
                  </Link>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <section>
          <PilloMiniAppCard
            title={t('pillo.title')}
            description={t('pillo.description')}
            loadingTitle={pilloT('loading.title')}
            loadingDescription={pilloT('loading.description')}
          />
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-3 px-2">
            <div className="h-1 w-8 rounded-full bg-primary/30" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/50">
              {t('install.title')}
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <InstallInstructionCard
              icon={Smartphone}
              title={t('install.iosTitle')}
              steps={[t('install.iosStep1'), t('install.iosStep2'), t('install.iosStep3')]}
            />
            <InstallInstructionCard
              icon={Download}
              title={t('install.androidTitle')}
              steps={[
                t('install.androidStep1'),
                t('install.androidStep2'),
                t('install.androidStep3')
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default MiniAppsPage;
