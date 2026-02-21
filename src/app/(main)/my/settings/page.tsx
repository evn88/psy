import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/app/(main)/admin/settings/_components/settings-form';
import { getTranslations } from 'next-intl/server';

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
    select: { language: true, theme: true }
  });

  if (!user) {
    redirect('/auth');
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
      <SettingsForm
        initialSettings={{
          language: user.language || 'en',
          theme: user.theme || 'system'
        }}
      />
    </div>
  );
}
