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
import { useBreadcrumbContext } from '@/components/breadcrumb-context';

const routeNameMap: Record<string, string> = {
  admin: 'Dashboard',
  users: 'Users',
  settings: 'Settings',
  surveys: 'Surveys',
  profile: 'Profile',
  create: 'Create'
};

/**
 * Breadcrumbs для админ-панели.
 * Поддерживает динамические сегменты через BreadcrumbContext.
 */
export const AdminBreadcrumbs = () => {
  const pathname = usePathname();
  const { dynamicSegments } = useBreadcrumbContext();
  const segments = (pathname || '').split('/').filter(Boolean);

  const adminIndex = segments.indexOf('admin');
  const displaySegments = segments.slice(adminIndex + 1);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink asChild>
            <Link href="/admin">Admin Panel</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {displaySegments.length > 0 && <BreadcrumbSeparator className="hidden md:block" />}
        {displaySegments.map((segment, index) => {
          const isLast = index === displaySegments.length - 1;
          const href = `/admin/${displaySegments.slice(0, index + 1).join('/')}`;
          const name =
            dynamicSegments[segment] ??
            routeNameMap[segment] ??
            segment.charAt(0).toUpperCase() + segment.slice(1);

          return (
            <React.Fragment key={`${segment}-${index}`}>
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
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
