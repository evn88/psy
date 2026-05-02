import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/profile-form';
import { getTranslations } from 'next-intl/server';

/**
 * Страница профиля администратора внутри админ-панели.
 * С отображением роли и последним входом.
 */
export default async function AdminProfilePage() {
  const session = await auth();
  const t = await getTranslations('Profile');

  if (!session?.user?.email) {
    redirect('/auth');
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      password: true,
      timezone: true,
      Authenticator: {
        select: {
          credentialID: true,
          credentialDeviceType: true,
          credentialBackedUp: true,
          transports: true
        }
      }
    }
  });

  if (!dbUser) {
    redirect('/auth');
  }

  const [googleAccount, lastLogin] = await Promise.all([
    prisma.account.findFirst({
      where: { userId: dbUser.id, provider: 'google' }
    }),
    prisma.user
      .findUnique({
        where: { id: dbUser.id },
        select: { id: true }
      })
      .then(() =>
        (async () => {
          try {
            return await prisma.userLoginHistory.findFirst({
              where: { userId: dbUser.id },
              orderBy: { createdAt: 'desc' }
            });
          } catch {
            return null;
          }
        })()
      )
  ]);

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
            passkeys={dbUser.Authenticator}
            isGoogleLinked={isGoogleLinked}
            googleLinkedAt={googleLinkedAt}
            hasPassword={hasPassword}
            lastLoginAt={lastLogin?.createdAt ?? null}
            lastLoginIp={lastLogin?.ip ?? null}
            timezone={dbUser?.timezone ?? 'UTC'}
            role={session.user.role}
            userEmail={session.user.email ?? ''}
          />
        </CardContent>
      </Card>
    </div>
  );
}
