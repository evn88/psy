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

const routeNameMap: Record<string, string> = {
  admin: 'Dashboard',
  users: 'Users',
  settings: 'Settings'
};

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const segments = (pathname || '').split('/').filter(Boolean);

  // Remove 'admin' from segments to handle it separately as root or first item
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
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
