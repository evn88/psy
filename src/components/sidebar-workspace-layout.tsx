'use client';

import type { ReactNode } from 'react';
import { BreadcrumbProvider } from '@/components/breadcrumb-context';
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
          <header className="sticky top-0 z-10 shrink-0 bg-background p-2 md:rounded-t-xl">
            <div className="flex h-12 min-w-0 items-center gap-2 rounded-xl bg-muted/50 px-1.5 sm:px-2">
              <SidebarTrigger className="size-10 shrink-0 rounded-lg hover:bg-background/80 md:size-9" />
              <div className="min-w-0 flex-1 px-1">{breadcrumbs}</div>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-5 md:p-6">{children}</div>
        </BreadcrumbProvider>
        {afterContent}
      </SidebarInset>
    </SidebarProvider>
  );
};
