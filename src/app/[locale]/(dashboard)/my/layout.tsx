import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { type ReactNode } from 'react';
import { auth } from '@/auth';
import { MyBreadcrumbs } from './_components/MyBreadcrumbs';
import { MySidebar } from './_components/MySidebar';
import { SurveySync } from '@/components/pwa/SurveySync';
import { SIDEBAR_COOKIE_NAME } from '@/components/ui/sidebar';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';
import { SidebarWorkspaceLayout } from '@/components/SidebarWorkspaceLayout';
import { getUserUnreadSurveysCount } from './surveys/actions';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

interface MyLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Возвращает авторизованного пользователя или выполняет locale-aware redirect на вход.
 * Дополнительный `throw` нужен только для корректного сужения типов после redirect.
 * @param user - пользователь из сессии.
 * @param locale - активная locale.
 * @returns Авторизованный пользователь.
 */
const requireAuthenticatedUser = <TUser,>(
  user: TUser | null | undefined,
  locale: AppLocale
): TUser => {
  if (!user) {
    redirect({ href: '/auth', locale });
    throw new Error('UNREACHABLE_AUTH_REDIRECT');
  }

  return user;
};

/**
 * Layout для личного кабинета пользователя.
 * Оставляет на сервере только авторизацию и загрузку данных для клиентской оболочки.
 * @param props - дочернее дерево раздела пользователя.
 * @returns Серверная обёртка, передающая данные в клиентский shell.
 */
const MyLayout = async ({ children, params }: Readonly<MyLayoutProps>) => {
  const { locale } = await params;
  const currentLocale: AppLocale = isLocale(locale) ? locale : defaultLocale;
  const session = await auth();
  const cookieStore = await cookies();
  const user = requireAuthenticatedUser(session?.user, currentLocale);
  const defaultSidebarOpen =
    cookieStore.get(SIDEBAR_COOKIE_NAME)?.value === 'true' ||
    cookieStore.get('sidebar:state')?.value === 'true';

  const unreadSurveysCount = await getUserUnreadSurveysCount();

  return (
    <SidebarWorkspaceLayout
      defaultSidebarOpen={defaultSidebarOpen}
      sidebar={<MySidebar user={user} unreadSurveysCount={unreadSurveysCount} />}
      breadcrumbs={<MyBreadcrumbs />}
      afterContent={<SurveySync />}
    >
      {children}
    </SidebarWorkspaceLayout>
  );
};

export default MyLayout;
