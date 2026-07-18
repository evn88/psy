'use client';

import type { ReactNode } from 'react';
import { BreadcrumbProvider } from '@/components/breadcrumb-context';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface SidebarWorkspaceLayoutProps {
  afterContent?: ReactNode;
  breadcrumbs: ReactNode;
  children: ReactNode;
  defaultSidebarOpen: boolean;
  headerActions?: ReactNode;
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
  headerActions,
  sidebar
}: SidebarWorkspaceLayoutProps) => {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen} className="workspace-shell">
      {sidebar}
      <SidebarInset>
        <BreadcrumbProvider>
          <header className="sticky top-0 z-30 shrink-0 p-2">
            <div className="flex h-12 min-w-0 items-center gap-2 rounded-xl border border-border/50 bg-card/[0.74] px-1.5 shadow-2xl shadow-background/80 backdrop-blur-2xl sm:px-2">
              <SidebarTrigger className="size-10 shrink-0 rounded-lg hover:bg-muted md:size-9" />
              <div className="min-w-0 flex-1 px-1">{breadcrumbs}</div>
              {headerActions && <div className="flex shrink-0 items-center">{headerActions}</div>}
            </div>
          </header>
          <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 pt-5 md:p-6">{children}</div>
        </BreadcrumbProvider>
        {afterContent}
      </SidebarInset>
    </SidebarProvider>
  );
};
