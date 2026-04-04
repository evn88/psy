import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/shared/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/my/profile-form';
import { getTranslations } from 'next-intl/server';

/**
 * Страница профиля в личном кабинете пользователя.
 * Без отображения роли. С последним входом и сменой пароля.
 */
export default async function MyProfilePage() {
  const session = await auth();
  const t = await getTranslations('Profile');

  if (!session?.user?.id) {
    redirect('/auth');
  }

  const [authenticatorCount, googleAccount, dbUser, lastLogin] = await Promise.all([
    prisma.authenticator.count({
      where: { userId: session.user.id }
    }),
    prisma.account.findFirst({
      where: { userId: session.user.id, provider: 'google' }
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, timezone: true }
    }),
    // Загружаем последний вход — может не существовать до миграции
    (async () => {
      try {
        return await prisma.userLoginHistory.findFirst({
          where: { userId: session.user.id },
          orderBy: { createdAt: 'desc' }
        });
      } catch {
        return null;
      }
    })()
  ]);

  const hasPasskeys = authenticatorCount > 0;
  const isGoogleLinked = !!googleAccount;
  const googleLinkedAt = googleAccount?.createdAt;
  const hasPassword = !!dbUser?.password;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProfileForm
            user={session.user}
            hasPasskeys={hasPasskeys}
            isGoogleLinked={isGoogleLinked}
            googleLinkedAt={googleLinkedAt}
            hasPassword={hasPassword}
            lastLoginAt={lastLogin?.createdAt ?? null}
            lastLoginIp={lastLogin?.ip ?? null}
            timezone={dbUser?.timezone ?? 'UTC'}
            userEmail={session.user.email ?? ''}
          />
        </CardContent>
      </Card>
    </div>
  );
}
