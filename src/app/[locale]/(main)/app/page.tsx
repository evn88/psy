import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AppWindow, Download, Home, Pill, ShieldCheck, Smartphone, User } from 'lucide-react';

import { requirePilloUser } from '@/features/pillo/lib/access';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Mini Apps',
  robots: {
    index: false,
    follow: false
  }
};

/**
 * Рисует карточку инструкции установки PWA.
 * @param props - иконка, заголовок и шаги.
 * @returns Карточка инструкции.
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
    <Card className="rounded-[1.5rem] border-white/60 bg-card/90 shadow-sm dark:border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2 text-sm text-muted-foreground">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};

/**
 * Страница меню мини-приложений.
 * @returns Список PWA-приложений и инструкция установки.
 */
const MiniAppsPage = async () => {
  const user = await requirePilloUser();
  const t = await getTranslations('MiniApps');
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)),transparent_34%),hsl(var(--background))] px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="rounded-full">
              <AppWindow className="mr-2 h-4 w-4" />
              {t('eyebrow')}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            <p className="max-w-xl text-muted-foreground">{t('description')}</p>
          </div>

          <nav className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 rounded-full">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.home')}</span>
              </Button>
            </Link>
            <Link href="/my">
              <Button variant="ghost" size="sm" className="gap-2 rounded-full">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.profile')}</span>
              </Button>
            </Link>
            {isAdmin && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-2 rounded-full">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('nav.admin')}</span>
                </Button>
              </Link>
            )}
          </nav>
        </header>

        <Link href="/app/pillo" className="block">
          <Card className="overflow-hidden rounded-[1.75rem] border-white/60 bg-card/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-foreground p-3 text-background">
                    <Pill className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{t('pillo.title')}</CardTitle>
                    <CardDescription>{t('pillo.description')}</CardDescription>
                  </div>
                </div>
                <Badge className="rounded-full">{t('pillo.badge')}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <span>{t('pillo.featureToday')}</span>
              <span>{t('pillo.featureStock')}</span>
              <span>{t('pillo.featureReminders')}</span>
            </CardContent>
          </Card>
        </Link>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            <h2 className="text-xl font-semibold">{t('install.title')}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
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
