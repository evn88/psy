import { auth } from '@/auth';
import { redirect } from '@/i18n/navigation';
import prisma from '@/lib/prisma';
import { ProfileForm } from '@/components/profile-form';
import { getTranslations } from 'next-intl/server';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';

interface MyProfilePageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Страница профиля в личном кабинете пользователя.
 * Без отображения роли. С последним входом и сменой пароля.
 */
export default async function MyProfilePage({ params }: MyProfilePageProps) {
  const { locale } = await params;
  const currentLocale: AppLocale = isLocale(locale) ? locale : defaultLocale;
  const session = await auth();
  const t = await getTranslations('Profile');

  if (!session?.user?.email) {
    redirect({ href: '/auth', locale: currentLocale });
  }

  const user = session!.user!;

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
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
    redirect({ href: '/auth', locale: currentLocale });
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
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t('description')}</p>
      </div>
      <ProfileForm
        user={user}
        passkeys={dbUser.Authenticator}
        isGoogleLinked={isGoogleLinked}
        googleLinkedAt={googleLinkedAt}
        hasPassword={hasPassword}
        lastLoginAt={lastLogin?.createdAt ?? null}
        lastLoginIp={lastLogin?.ip ?? null}
        timezone={dbUser?.timezone ?? 'UTC'}
        userEmail={user.email ?? ''}
      />
    </div>
  );
}
