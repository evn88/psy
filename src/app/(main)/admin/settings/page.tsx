import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { redirect } from 'next/navigation';
import { SettingsForm } from './_components/settings-form';
import { getTranslations } from 'next-intl/server';

export default async function SettingsPage() {
  const session = await auth();
  const t = await getTranslations('Settings');

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true, theme: true }
  });

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
      <SettingsForm
        initialSettings={{
          language: user.language || 'en',
          theme: user.theme || 'system'
        }}
      />
    </div>
  );
}
