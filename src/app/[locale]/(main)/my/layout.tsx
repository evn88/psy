import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { MySidebar } from '@/components/my/my-sidebar';
import { MyBreadcrumbs } from '@/components/my/my-breadcrumbs';
import { BreadcrumbProvider } from '@/components/breadcrumb-context';
import { getUserUnreadSurveysCount } from './surveys/actions';
import { Separator } from '@/components/ui/separator';
import {
  SIDEBAR_COOKIE_NAME,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { SurveySync } from '@/components/pwa/SurveySync';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

/**
 * Layout для личного кабинета пользователя.
 * Оборачивает содержимое в BreadcrumbProvider для поддержки динамических названий.
 */
export default async function MyLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const cookieStore = await cookies();
  const defaultOpen =
    cookieStore.get(SIDEBAR_COOKIE_NAME)?.value === 'true' ||
    cookieStore.get('sidebar:state')?.value === 'true';

  if (!session?.user) {
    redirect('/auth');
  }

  const unreadSurveysCount = await getUserUnreadSurveysCount();

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <MySidebar user={session.user} unreadSurveysCount={unreadSurveysCount} />
      <SidebarInset>
        <BreadcrumbProvider>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1 h-9 w-9 md:h-7 md:w-7" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <MyBreadcrumbs />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-6">{children}</div>
        </BreadcrumbProvider>
        <SurveySync />
      </SidebarInset>
    </SidebarProvider>
  );
}
