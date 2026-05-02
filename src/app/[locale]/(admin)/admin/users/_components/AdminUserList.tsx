'use client';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminUserRow } from './AdminUserRow';
import { useTranslations } from 'next-intl';
import type { AdminUserData } from './types';

interface AdminUserListProps {
  users: AdminUserData[];
}

/**
 * Таблица пользователей в admin-панели.
 * Расширена колонками: Provider, Verified, Last Seen.
 */
export function AdminUserList({ users }: AdminUserListProps) {
  const t = useTranslations('Admin');

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('nameLabel')}</TableHead>
            <TableHead>{t('emailLabel')}</TableHead>
            <TableHead>{t('providerColumn')}</TableHead>
            <TableHead>{t('roleLabel')}</TableHead>
            <TableHead>{t('statusColumn')}</TableHead>
            <TableHead>{t('verifiedColumn')}</TableHead>
            <TableHead>{t('lastSeenColumn')}</TableHead>
            <TableHead>{t('joinedColumn')}</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <AdminUserRow key={user.id} user={user} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
