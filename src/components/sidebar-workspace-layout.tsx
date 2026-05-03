'use client';

import type { ReactNode } from 'react';
import { BreadcrumbProvider } from '@/components/breadcrumb-context';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface SidebarWorkspaceLayoutProps {
  afterContent?: ReactNode;
  breadcrumbs: ReactNode;
  children: ReactNode;
  defaultSidebarOpen: boolean;
  sidebar: ReactNode;
}

/**
 * Отрисовывает общую интерактивную оболочку приватных разделов с сайдбаром.
 * Серверный layout передаёт сюда только подготовленные данные и готовые слоты.
 * @param props - конфигурация shell, сайдбар, breadcrumbs и основное содержимое.
 * @returns Клиентская оболочка раздела с единым поведением sidebar и breadcrumbs.
 */
export const SidebarWorkspaceLayout = ({
  afterContent,
  breadcrumbs,
  children,
  defaultSidebarOpen,
  sidebar
}: SidebarWorkspaceLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      {sidebar}
      <SidebarInset>
        <BreadcrumbProvider>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1 h-9 w-9 md:h-7 md:w-7" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              {breadcrumbs}
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-6">{children}</div>
        </BreadcrumbProvider>
        {afterContent}
      </SidebarInset>
    </SidebarProvider>
  );
};
