import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/shared/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ProfileForm } from '@/components/my/profile-form';
import { getTranslations } from 'next-intl/server';

/**
 * Страница профиля администратора внутри админ-панели.
 * Переиспользует ProfileForm из общего расположения.
 */
export default async function AdminProfilePage() {
  const session = await auth();
  const t = await getTranslations('Profile');

  if (!session?.user) {
    redirect('/auth');
  }

  const authenticatorCount = await prisma.authenticator.count({
    where: { userId: session.user.id }
  });
  const hasPasskeys = authenticatorCount > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProfileForm user={session.user} hasPasskeys={hasPasskeys} />

          <div className="grid gap-2">
            <Label>{t('roleLabel')}</Label>
            <Input defaultValue={session.user.role ?? 'ADMIN'} disabled className="bg-muted" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
