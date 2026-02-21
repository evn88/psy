import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { MySidebar } from '@/components/my/my-sidebar';
import { MyBreadcrumbs } from '@/components/my/my-breadcrumbs';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

/**
 * Layout для личного кабинета пользователя.
 * Содержит sidebar навигацию и breadcrumbs.
 * Доступен для всех авторизованных пользователей (GUEST, USER, ADMIN).
 */
export default async function MyLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar:state')?.value === 'true';

  if (!session?.user) {
    redirect('/auth');
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <MySidebar user={session.user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <MyBreadcrumbs />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
