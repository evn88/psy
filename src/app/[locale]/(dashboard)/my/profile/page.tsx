import { auth } from '@/auth';
import { redirect } from '@/i18n/navigation';
import prisma from '@/lib/prisma';
import { ProfileForm } from '@/components/profile-form';
import { getTranslations } from 'next-intl/server';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { Sparkles, UserRound } from 'lucide-react';

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
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Личные данные</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t('description')}
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <UserRound className="h-7 w-7" />
          </div>
        </div>
      </div>

      <ProfileForm
        user={user}
        passkeys={dbUser.Authenticator}
        isGoogleLinked={isGoogleLinked}
        googleLinkedAt={googleLinkedAt}
        hasPassword={hasPassword}
        lastLoginAt={lastLogin?.createdAt ?? null}
        lastLoginIp={lastLogin?.ip ?? null}
        timezone={dbUser.timezone}
        userEmail={user.email ?? ''}
      />
    </div>
  );
}
