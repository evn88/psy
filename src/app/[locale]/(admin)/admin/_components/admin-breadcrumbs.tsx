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
 * Breadcrumbs для админ-панели.
 * Поддерживает динамические сегменты через BreadcrumbContext.
 */
export const AdminBreadcrumbs = () => {
  const pathname = usePathname();
  const t = useTranslations('Admin.sidebarMenu');
  const tSurveys = useTranslations('AdminSurveys');
  const { dynamicSegments } = useBreadcrumbContext();
  const segments = (pathname || '').split('/').filter(Boolean);

  const adminIndex = segments.indexOf('admin');
  const displaySegments = segments.slice(adminIndex + 1);
  const routeNameMap: Record<string, string> = {
    users: t('users'),
    settings: t('settings'),
    surveys: t('surveys'),
    clients: t('clients'),
    schedule: t('schedule'),
    payments: t('payments'),
    packages: t('packages'),
    providers: t('paymentProviders'),
    blog: t('blog'),
    'send-email': t('sendEmail'),
    'email-templates': t('emailTemplates'),
    notifications: t('notifications'),
    backups: t('backups'),
    logs: t('logs'),
    apps: t('apps'),
    profile: t('profile'),
    create: tSurveys('createSurveyTitle')
  };

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        {displaySegments.length > 0 && (
          <>
            <BreadcrumbItem className="hidden md:inline-flex">
              <BreadcrumbLink asChild className="whitespace-nowrap">
                <Link href="/admin">{t('adminPanel')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
          </>
        )}
        {displaySegments.map((segment, index) => {
          const isLast = index === displaySegments.length - 1;
          const href = `/admin/${displaySegments.slice(0, index + 1).join('/')}`;
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
