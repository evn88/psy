import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { type ReactNode } from 'react';
import { auth } from '@/auth';
import { MyBreadcrumbs } from './_components/my-breadcrumbs';
import { MySidebar } from './_components/my-sidebar';
import { SurveySync } from '@/components/pwa/survey-sync';
import { getDefaultSidebarOpen, SIDEBAR_COOKIE_NAME } from '@/lib/sidebar-state';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';
import { SidebarWorkspaceLayout } from '@/components/sidebar-workspace-layout';
import { getUserUnreadSurveysCount } from './surveys/actions';
import { requireAuthenticatedUser } from '@/lib/auth-helpers';

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
  const sidebarCookieValue =
    cookieStore.get(SIDEBAR_COOKIE_NAME)?.value ?? cookieStore.get('sidebar:state')?.value;
  const defaultSidebarOpen = getDefaultSidebarOpen(sidebarCookieValue);

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
