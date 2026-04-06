import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';
import { auth } from '@/auth';
import { AdminBreadcrumbs } from '@/components/admin/admin-breadcrumbs';
import { AppSidebar } from '@/components/admin/app-sidebar';
import { SIDEBAR_COOKIE_NAME } from '@/components/ui/sidebar';
import { SidebarWorkspaceLayout } from '@/shared/SidebarWorkspaceLayout';
import { getAdminUnreadSurveysCount } from './surveys/actions';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Layout для админ-панели.
 * Оставляет на сервере только проверку доступа и загрузку данных для shell.
 * @param props - дочернее дерево админского раздела.
 * @returns Серверная обёртка, передающая данные в клиентский shell.
 */
const AdminLayout = async ({ children }: Readonly<AdminLayoutProps>) => {
  const session = await auth();
  const cookieStore = await cookies();
  const defaultSidebarOpen =
    cookieStore.get(SIDEBAR_COOKIE_NAME)?.value === 'true' ||
    cookieStore.get('sidebar:state')?.value === 'true';

  if (!session?.user) {
    redirect('/auth');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/my');
  }

  const unreadSurveysCount = await getAdminUnreadSurveysCount();

  return (
    <SidebarWorkspaceLayout
      defaultSidebarOpen={defaultSidebarOpen}
      sidebar={<AppSidebar user={session.user} unreadSurveysCount={unreadSurveysCount} />}
      breadcrumbs={<AdminBreadcrumbs />}
    >
      {children}
    </SidebarWorkspaceLayout>
  );
};

export default AdminLayout;
