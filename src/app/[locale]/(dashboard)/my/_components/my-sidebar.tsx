'use client';

import * as React from 'react';
import {
  Brain,
  CalendarDays,
  ChevronsUpDown,
  ClipboardList,
  CreditCard,
  FileText,
  Home,
  AppWindow,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  User
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Link, usePathname } from '@/i18n/navigation';
import {
  WorkspaceSidebarNav,
  type WorkspaceSidebarGroup
} from '@/components/workspace-sidebar-nav';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';
import { useTranslations } from 'next-intl';

interface MySidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
  unreadSurveysCount?: number;
}

/**
 * Sidebar компонент для личного кабинета пользователя.
 * Отображает навигацию в зависимости от роли (USER видит всё, GUEST — только Профиль).
 */
export const MySidebar = ({ user, unreadSurveysCount = 0, ...props }: MySidebarProps) => {
  const pathname = usePathname();
  const t = useTranslations('My.sidebarMenu');
  const tAuth = useTranslations('Auth');
  const { setOpenMobile, isMobile } = useSidebar();

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  const isGuest = user.role === 'GUEST';

  const routes = {
    dashboard: {
      title: t('dashboard'),
      url: '/my',
      icon: LayoutDashboard,
      isActive: pathname === '/my'
    },
    surveys: {
      title: t('surveys'),
      url: '/my/surveys',
      icon: ClipboardList,
      isActive: pathname.startsWith('/my/surveys'),
      badge: unreadSurveysCount
    },
    sessions: {
      title: t('sessions'),
      url: '/my/sessions',
      icon: CalendarDays,
      isActive: pathname.startsWith('/my/sessions')
    },
    payments: {
      title: t('payments'),
      url: '/my/payments',
      icon: CreditCard,
      isActive: pathname.startsWith('/my/payments')
    },
    data: {
      title: t('data'),
      url: '/my/data',
      icon: FileText,
      isActive: pathname.startsWith('/my/data')
    },
    apps: {
      title: t('apps'),
      url: '/app',
      icon: AppWindow,
      isActive: pathname.startsWith('/app')
    },
    profile: {
      title: t('profile'),
      url: '/my/profile',
      icon: User,
      isActive: pathname.startsWith('/my/profile')
    }
  } satisfies Record<string, WorkspaceSidebarGroup['routes'][number]>;

  const navigationGroups: WorkspaceSidebarGroup[] = isGuest
    ? [{ label: t('groupAccount'), routes: [routes.profile] }]
    : [
        {
          label: t('groupMain'),
          routes: [routes.dashboard, routes.surveys, routes.sessions]
        },
        {
          label: t('groupResources'),
          routes: [routes.payments, routes.data, routes.apps]
        },
        { label: t('groupAccount'), routes: [routes.profile] }
      ];

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border/70 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-12 rounded-xl px-2">
              <Link href="/my">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Brain className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:!hidden">
                  <span className="truncate font-semibold">Vershkov</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">{t('title')}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-1 py-1">
        <WorkspaceSidebarNav groups={navigationGroups} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/70 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-12 rounded-xl px-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={user.image || ''} alt={user.name || ''} />
                    <AvatarFallback className="rounded-lg">{user.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:!hidden">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">
                      {user.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:!hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage src={user.image || ''} alt={user.name || ''} />
                      <AvatarFallback className="rounded-lg">
                        {user.name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user.name}</span>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/"
                      className="flex items-center cursor-pointer"
                      onClick={closeMobileSidebar}
                    >
                      <Home className="mr-2 h-4 w-4" />
                      {t('backToSite')}
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'ADMIN' && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin"
                        className="flex items-center cursor-pointer"
                        onClick={closeMobileSidebar}
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        {t('goToAdmin')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/my/settings"
                    className="flex items-center cursor-pointer"
                    onClick={closeMobileSidebar}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {t('settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {tAuth('signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
