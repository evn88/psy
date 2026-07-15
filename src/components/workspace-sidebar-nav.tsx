'use client';

import type { ComponentType } from 'react';

import { Link } from '@/i18n/navigation';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';

export interface WorkspaceSidebarRoute {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  isActive: boolean;
  badge?: number;
}

export interface WorkspaceSidebarGroup {
  label: string;
  routes: WorkspaceSidebarRoute[];
}

interface WorkspaceSidebarNavProps {
  groups: WorkspaceSidebarGroup[];
}

/** Отрисовывает сгруппированную навигацию рабочего раздела. */
export const WorkspaceSidebarNav = ({ groups }: WorkspaceSidebarNavProps) => {
  const { isMobile, setOpenMobile } = useSidebar();

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  return groups.map(group => (
    <SidebarGroup key={group.label} className="py-2">
      <SidebarGroupLabel className="px-3 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/55">
        {group.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {group.routes.map(route => (
            <SidebarMenuItem key={route.url}>
              <SidebarMenuButton
                asChild
                isActive={route.isActive}
                tooltip={route.title}
                className="h-10 rounded-lg px-3 data-[active=true]:bg-sidebar-primary/10 data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary"
              >
                <Link href={route.url} onClick={closeMobileSidebar}>
                  <route.icon />
                  <span>{route.title}</span>
                </Link>
              </SidebarMenuButton>
              {route.badge ? (
                <SidebarMenuBadge className="bg-primary/10 text-primary">
                  {route.badge > 99 ? '99+' : route.badge}
                </SidebarMenuBadge>
              ) : null}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ));
};
