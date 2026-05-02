import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { defaultLocale } from '@/i18n/config';
import { SettingsForm } from '@/components/SettingsForm';
import { NotificationSettingsForm } from './_components/NotificationSettingsForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function SettingsPage() {
  const session = await auth();
  const t = await getTranslations('Settings');

  if (!session?.user?.id) {
    redirect('/auth');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true, theme: true, role: true, notificationSettings: true }
  });

  if (!user || user.role !== 'ADMIN') {
    redirect('/auth');
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>

      <Tabs defaultValue="appearance" className="w-full max-w-2xl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="appearance">Основные</TabsTrigger>
          <TabsTrigger value="notifications">Уведомления</TabsTrigger>
        </TabsList>
        <TabsContent value="appearance" className="mt-6">
          <SettingsForm
            initialSettings={{
              language: user.language || defaultLocale,
              theme: user.theme || 'system'
            }}
          />
        </TabsContent>
        <TabsContent value="notifications" className="mt-6">
          <NotificationSettingsForm initialSettings={user.notificationSettings || {}} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
