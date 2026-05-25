import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { PushNotificationSettings } from '@/components/pwa/push-notification-settings';
import { BlogNotificationsToggle } from './_components/blog-notifications-toggle';
import { SettingsForm } from '@/components/settings-form';
import { defaultLocale, type AppLocale, isLocale } from '@/i18n/config';

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
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t('description')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <SettingsForm
          initialSettings={{
            language: user.language || defaultLocale,
            theme: user.theme || 'system'
          }}
        />
        <PushNotificationSettings />
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md h-fit">
          <BlogNotificationsToggle initialValue={user.blogNotifications ?? false} />
        </div>
      </div>
    </div>
  );
}
