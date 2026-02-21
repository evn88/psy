'use client';

import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * Breadcrumbs компонент для навигации внутри личного кабинета.
 * Отображает иерархическую цепочку маршрутов от /my.
 */
export const MyBreadcrumbs = () => {
  const pathname = usePathname();
  const t = useTranslations('My.breadcrumbs');
  const segments = (pathname || '').split('/').filter(Boolean);

  // Удаляем 'my' из сегментов для отдельной обработки
  const myIndex = segments.indexOf('my');
  const displaySegments = segments.slice(myIndex + 1);

  /** Маппинг сегментов URL → переводы */
  const routeNameMap: Record<string, string> = {
    profile: t('profile'),
    surveys: t('surveys'),
    sessions: t('sessions'),
    payments: t('payments'),
    data: t('data'),
    settings: t('settings')
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink asChild>
            <Link href="/my">{t('home')}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {displaySegments.length > 0 && <BreadcrumbSeparator className="hidden md:block" />}
        {displaySegments.map((segment, index) => {
          const isLast = index === displaySegments.length - 1;
          const href = `/my/${displaySegments.slice(0, index + 1).join('/')}`;
          const name = routeNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

          return (
            <React.Fragment key={segment}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{name}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
        {displaySegments.length === 0 && (
          <BreadcrumbItem>
            <BreadcrumbPage>{t('dashboard')}</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
