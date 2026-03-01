'use client';

import * as React from 'react';
import {
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  ClipboardList,
  CalendarDays,
  CreditCard,
  FileText,
  ChevronsUpDown,
  Brain,
  Home
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

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

  const isGuest = user.role === 'GUEST';

  /** Полный список маршрутов для роли USER */
  const allRoutes = [
    {
      title: t('dashboard'),
      url: '/my',
      icon: LayoutDashboard,
      isActive: pathname === '/my'
    },
    {
      title: t('surveys'),
      url: '/my/surveys',
      icon: ClipboardList,
      isActive: pathname.startsWith('/my/surveys')
    },
    {
      title: t('sessions'),
      url: '/my/sessions',
      icon: CalendarDays,
      isActive: pathname.startsWith('/my/sessions')
    },
    {
      title: t('payments'),
      url: '/my/payments',
      icon: CreditCard,
      isActive: pathname.startsWith('/my/payments')
    },
    {
      title: t('data'),
      url: '/my/data',
      icon: FileText,
      isActive: pathname.startsWith('/my/data')
    },
    {
      title: t('profile'),
      url: '/my/profile',
      icon: User,
      isActive: pathname.startsWith('/my/profile')
    }
  ];

  /** Маршруты для GUEST — только Профиль */
  const guestRoutes = allRoutes.filter(r => r.url === '/my/profile');

  const routes = isGuest ? guestRoutes : allRoutes;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
              <Link href="/my">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Brain className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:!hidden">
                  <span className="truncate font-semibold">{t('title')}</span>
                  <span className="truncate text-xs">v1.0.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {routes.map(item => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={item.isActive} tooltip={item.title}>
                <Link href={item.url}>
                  <item.icon />
                  <div
                    className={cn(
                      'absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-destructive animate-pulse group-data-[collapsible=icon]:right-1.5 group-data-[collapsible=icon]:top-1.5 group-data-[collapsible=icon]:translate-y-0',
                      item.url === '/my/surveys' && unreadSurveysCount > 0 ? 'block' : 'hidden'
                    )}
                  />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.image || ''} alt={user.name || ''} />
                    <AvatarFallback className="rounded-lg">{user.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:!hidden">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
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
                    <Avatar className="h-8 w-8 rounded-lg">
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
                    <Link href="/" className="flex items-center cursor-pointer">
                      <Home className="mr-2 h-4 w-4" />
                      {t('backToSite')}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/my/settings" className="flex items-center cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    {t('settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
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
