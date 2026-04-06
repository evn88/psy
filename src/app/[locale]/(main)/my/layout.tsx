import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';
import { auth } from '@/auth';
import { MyBreadcrumbs } from '@/components/my/my-breadcrumbs';
import { MySidebar } from '@/components/my/my-sidebar';
import { SurveySync } from '@/components/pwa/SurveySync';
import { SIDEBAR_COOKIE_NAME } from '@/components/ui/sidebar';
import { SidebarWorkspaceLayout } from '@/shared/SidebarWorkspaceLayout';
import { getUserUnreadSurveysCount } from './surveys/actions';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

interface MyLayoutProps {
  children: ReactNode;
}

/**
 * Layout для личного кабинета пользователя.
 * Оставляет на сервере только авторизацию и загрузку данных для клиентской оболочки.
 * @param props - дочернее дерево раздела пользователя.
 * @returns Серверная обёртка, передающая данные в клиентский shell.
 */
const MyLayout = async ({ children }: Readonly<MyLayoutProps>) => {
  const session = await auth();
  const cookieStore = await cookies();
  const defaultSidebarOpen =
    cookieStore.get(SIDEBAR_COOKIE_NAME)?.value === 'true' ||
    cookieStore.get('sidebar:state')?.value === 'true';

  if (!session?.user) {
    redirect('/auth');
  }

  const unreadSurveysCount = await getUserUnreadSurveysCount();

  return (
    <SidebarWorkspaceLayout
      defaultSidebarOpen={defaultSidebarOpen}
      sidebar={<MySidebar user={session.user} unreadSurveysCount={unreadSurveysCount} />}
      breadcrumbs={<MyBreadcrumbs />}
      afterContent={<SurveySync />}
    >
      {children}
    </SidebarWorkspaceLayout>
  );
};

export default MyLayout;
