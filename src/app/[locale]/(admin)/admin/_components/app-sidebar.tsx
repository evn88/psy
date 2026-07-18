'use client';

import * as React from 'react';
import {
  BookOpen,
  Brain,
  Calendar,
  ChevronsUpDown,
  ClipboardList,
  CreditCard,
  AppWindow,
  Home,
  LayoutDashboard,
  LogOut,
  Package,
  ScrollText,
  Send,
  Settings,
  ShieldEllipsis,
  User,
  UserCircle,
  Users
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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  unreadSurveysCount?: number;
}

/**
 * Sidebar компонент для админ-панели.
 * Содержит навигацию: Dashboard, Users, Surveys, Profile.
 */
export function AppSidebar({ user, unreadSurveysCount = 0, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const tItems = useTranslations('Admin.sidebarMenu');
  const tAuth = useTranslations('Auth');
  const { setOpenMobile, isMobile } = useSidebar();

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  const routes = {
    dashboard: {
      title: tItems('dashboard'),
      url: '/admin',
      icon: LayoutDashboard,
      isActive: pathname === '/admin'
    },
    users: {
      title: tItems('users'),
      url: '/admin/users',
      icon: Users,
      isActive: pathname.startsWith('/admin/users')
    },
    clients: {
      title: tItems('clients'),
      url: '/admin/clients',
      icon: UserCircle,
      isActive: pathname.startsWith('/admin/clients')
    },
    surveys: {
      title: tItems('surveys'),
      url: '/admin/surveys',
      icon: ClipboardList,
      isActive: pathname.startsWith('/admin/surveys'),
      badge: unreadSurveysCount
    },
    intake: {
      title: tItems('intake'),
      url: '/admin/intake',
      icon: ClipboardList,
      isActive: pathname.startsWith('/admin/intake')
    },
    schedule: {
      title: tItems('schedule'),
      url: '/admin/schedule',
      icon: Calendar,
      isActive: pathname.startsWith('/admin/schedule')
    },
    payments: {
      title: tItems('payments'),
      url: '/admin/payments',
      icon: CreditCard,
      isActive: pathname === '/admin/payments'
    },
    packages: {
      title: tItems('packages'),
      url: '/admin/payments/packages',
      icon: Package,
      isActive: pathname.startsWith('/admin/payments/packages')
    },
    paymentProviders: {
      title: tItems('paymentProviders'),
      url: '/admin/payments/providers',
      icon: Settings,
      isActive: pathname.startsWith('/admin/payments/providers')
    },
    blog: {
      title: tItems('blog'),
      url: '/admin/blog',
      icon: BookOpen,
      isActive: pathname.startsWith('/admin/blog')
    },
    sendEmail: {
      title: tItems('sendEmail'),
      url: '/admin/send-email',
      icon: Send,
      isActive: pathname.startsWith('/admin/send-email')
    },
    backups: {
      title: tItems('backups'),
      url: '/admin/backups',
      icon: ShieldEllipsis,
      isActive: pathname.startsWith('/admin/backups')
    },
    logs: {
      title: tItems('logs'),
      url: '/admin/logs',
      icon: ScrollText,
      isActive: pathname.startsWith('/admin/logs')
    },
    apps: {
      title: tItems('apps'),
      url: '/app',
      icon: AppWindow,
      isActive: pathname.startsWith('/app')
    },
    profile: {
      title: tItems('profile'),
      url: '/admin/profile',
      icon: User,
      isActive: pathname.startsWith('/admin/profile')
    }
  } satisfies Record<string, WorkspaceSidebarGroup['routes'][number]>;

  const navigationGroups: WorkspaceSidebarGroup[] = [
    { label: tItems('groupOverview'), routes: [routes.dashboard] },
    {
      label: tItems('groupPeople'),
      routes: [routes.users, routes.clients, routes.intake, routes.surveys]
    },
    {
      label: tItems('groupOperations'),
      routes: [
        routes.schedule,
        routes.payments,
        routes.packages,
        routes.paymentProviders,
        routes.sendEmail
      ]
    },
    { label: tItems('groupContent'), routes: [routes.blog, routes.apps] },
    { label: tItems('groupSystem'), routes: [routes.backups, routes.logs, routes.profile] }
  ];

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-12 rounded-xl px-2">
              <Link href="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Brain className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:!hidden">
                  <span className="truncate font-semibold">Vershkov</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    {tItems('adminPanel')}
                  </span>
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
                      {tItems('backToSite')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/my"
                      className="flex items-center cursor-pointer"
                      onClick={closeMobileSidebar}
                    >
                      <UserCircle className="mr-2 h-4 w-4" />
                      {tItems('goToMy')}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/admin/settings"
                    className="flex items-center cursor-pointer"
                    onClick={closeMobileSidebar}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {tItems('settings')}
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
}
