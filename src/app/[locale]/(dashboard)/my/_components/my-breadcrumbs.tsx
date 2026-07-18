'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useBreadcrumbContext } from '@/components/breadcrumb-context';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Link, usePathname } from '@/i18n/navigation';

/**
 * Breadcrumbs компонент для навигации внутри личного кабинета.
 * Поддерживает динамические сегменты через BreadcrumbContext.
 */
export const MyBreadcrumbs = () => {
  const pathname = usePathname();
  const t = useTranslations('My.breadcrumbs');
  const { dynamicSegments } = useBreadcrumbContext();
  const segments = (pathname || '').split('/').filter(Boolean);

  const myIndex = segments.indexOf('my');
  const displaySegments = segments.slice(myIndex + 1);

  const routeNameMap: Record<string, string> = {
    profile: t('profile'),
    surveys: t('surveys'),
    sessions: t('sessions'),
    payments: t('payments'),
    data: t('data'),
    notifications: t('notifications'),
    settings: t('settings')
  };

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        {displaySegments.length > 0 && (
          <>
            <BreadcrumbItem className="hidden md:inline-flex">
              <BreadcrumbLink asChild className="whitespace-nowrap">
                <Link href="/my">{t('home')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
          </>
        )}
        {displaySegments.map((segment, index) => {
          const isLast = index === displaySegments.length - 1;
          const href = `/my/${displaySegments.slice(0, index + 1).join('/')}`;
          const name =
            dynamicSegments[segment] ??
            routeNameMap[segment] ??
            segment.charAt(0).toUpperCase() + segment.slice(1);

          return (
            <React.Fragment key={`${segment}-${index}`}>
              <BreadcrumbItem className={isLast ? 'min-w-0' : 'hidden md:inline-flex'}>
                {isLast ? (
                  <BreadcrumbPage className="truncate font-medium">{name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className="whitespace-nowrap">
                    <Link href={href}>{name}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
            </React.Fragment>
          );
        })}
        {displaySegments.length === 0 && (
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate font-medium">{t('dashboard')}</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
