import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PushNotificationSettings } from '@/components/pwa/PushNotificationSettings';
import { BlogNotificationsToggle } from './_components/BlogNotificationsToggle';
import { SettingsForm } from '@/components/SettingsForm';
import { defaultLocale } from '@/i18n/config';

/**
 * Страница настроек в личном кабинете.
 * Переиспользует SettingsForm (язык и тема) из admin/settings.
 */
export default async function MySettingsPage() {
  const session = await auth();
  const t = await getTranslations('Settings');

  if (!session?.user?.id) {
    redirect('/auth');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true, theme: true, blogNotifications: true }
  });

  if (!user) {
    redirect('/auth');
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
      <SettingsForm
        initialSettings={{
          language: user.language || defaultLocale,
          theme: user.theme || 'system'
        }}
      />
      <PushNotificationSettings />
      <div className="rounded-lg border p-4">
        <BlogNotificationsToggle initialValue={user.blogNotifications ?? false} />
      </div>
    </div>
  );
}
