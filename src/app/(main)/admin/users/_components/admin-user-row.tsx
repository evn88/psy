'use client';

import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Role } from '@prisma/client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EditUserDialog } from './edit-user-dialog';
import { DeleteUserDialog } from './delete-user-dialog';
import { useTranslations } from 'next-intl';

interface AdminUserRowProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    createdAt: Date;
    sessions: { expires: Date }[];
    isOnline: boolean | null;
    fmtCreatedAt: string;
  };
}

/**
 * Строка таблицы пользователя в admin-панели.
 * Использует next-intl для интернационализации.
 */
export const AdminUserRow = ({ user }: AdminUserRowProps) => {
  const t = useTranslations('Admin');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell>{user.name || t('noName')}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>
          <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>{user.role}</Badge>
        </TableCell>
        <TableCell>
          {user.isOnline ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              {t('online')}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-500">
              {t('offline')}
            </Badge>
          )}
        </TableCell>
        <TableCell>{user.fmtCreatedAt}</TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{t('actions')}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
                {t('actions')}
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                {t('copyId')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                {t('editUser')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
                {t('deleteUser')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <EditUserDialog user={user} open={showEditDialog} onOpenChange={setShowEditDialog} />
      <DeleteUserDialog
        userId={user.id}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </>
  );
};
