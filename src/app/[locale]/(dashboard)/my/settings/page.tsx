import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { PushNotificationSettings } from '@/components/pwa/push-notification-settings';
import { BlogNotificationsToggle } from './_components/blog-notifications-toggle';
import { SettingsForm } from '@/components/settings-form';
import { defaultLocale, type AppLocale, isLocale } from '@/i18n/config';
import { Settings, Sparkles } from 'lucide-react';

interface MySettingsPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Страница настроек в личном кабинете.
 * Переиспользует SettingsForm (язык и тема) из admin/settings.
 */
export default async function MySettingsPage({ params }: MySettingsPageProps) {
  const { locale } = await params;
  const currentLocale: AppLocale = isLocale(locale) ? locale : defaultLocale;
  const session = await auth();
  const t = await getTranslations('Settings');

  if (!session?.user?.id) {
    redirect({ href: '/auth', locale: currentLocale });
  }

  const userId = session!.user!.id!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { language: true, theme: true, blogNotifications: true }
  });

  if (!user) {
    redirect({ href: '/auth', locale: currentLocale });
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* Premium Hero-блок */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-card to-card p-6 sm:p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -ml-16 -mb-16 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">{t('title')}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Настройки</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t('description')}
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <Settings className="h-7 w-7" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <SettingsForm
          initialSettings={{
            language: user.language || defaultLocale,
            theme: user.theme || 'system'
          }}
        />
        <PushNotificationSettings />
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md h-fit">
          <BlogNotificationsToggle initialValue={user.blogNotifications ?? false} />
        </div>
      </div>
    </div>
  );
}
