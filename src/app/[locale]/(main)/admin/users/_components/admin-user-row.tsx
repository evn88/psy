'use client';

import { Ban, CheckCircle2, MoreHorizontal, UserCheck, XCircle } from 'lucide-react';
import { useState } from 'react';

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
import { UserDetailsDialog } from './user-details-dialog';
import { toggleUserDisabled } from '../actions';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { AdminUserData } from './types';

interface AdminUserRowProps {
  user: AdminUserData;
}

/** Карта иконок/названий провайдеров */
const PROVIDER_DISPLAY: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  google: { label: 'Google', variant: 'default' },
  credentials: { label: 'Email', variant: 'secondary' },
  webauthn: { label: 'Passkey', variant: 'outline' },
  unknown: { label: '—', variant: 'outline' }
};

/**
 * Форматирует дату в относительное время (напр. «5 мин назад»).
 * @param date - дата для форматирования
 * @returns относительная строка
 */
const formatRelativeTime = (date: Date | null): string => {
  if (!date) return '—';

  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString('ru-RU');
};

/**
 * Строка таблицы пользователя в admin-панели.
 * Расширена: кликабельное имя, Provider, Verified, Last Seen, Disable/Enable.
 */
export const AdminUserRow = ({ user }: AdminUserRowProps) => {
  const t = useTranslations('Admin');
  const router = useRouter();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [toggling, setToggling] = useState(false);

  const providerInfo = PROVIDER_DISPLAY[user.registrationProvider] ?? PROVIDER_DISPLAY['unknown'];

  /**
   * Переключает состояние учётной записи (включена/отключена).
   */
  const handleToggleDisabled = async () => {
    setToggling(true);
    await toggleUserDisabled(user.id, !user.isDisabled);
    setToggling(false);
    router.refresh();
  };

  return (
    <>
      <TableRow className={user.isDisabled ? 'opacity-50' : ''}>
        {/* Кликабельное имя → открывает модалку */}
        <TableCell>
          <button
            type="button"
            onClick={() => setShowDetailsDialog(true)}
            className="text-left font-medium text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
          >
            {user.name || t('noName')}
          </button>
          {user.isDisabled && (
            <Badge variant="destructive" className="ml-2 text-xs">
              {t('disabled')}
            </Badge>
          )}
        </TableCell>

        <TableCell className="text-muted-foreground">{user.email}</TableCell>

        {/* Провайдер регистрации */}
        <TableCell>
          <Badge variant={providerInfo.variant}>{providerInfo.label}</Badge>
        </TableCell>

        {/* Роль */}
        <TableCell>
          <Badge
            variant={
              user.role === 'ADMIN' ? 'default' : user.role === 'USER' ? 'outline' : 'secondary'
            }
          >
            {user.role}
          </Badge>
        </TableCell>

        {/* Статус Online/Offline */}
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

        {/* Верифицирован */}
        <TableCell>
          {user.emailVerified || user.registrationProvider === 'google' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </TableCell>

        {/* Last Seen */}
        <TableCell className="text-muted-foreground text-sm">
          {formatRelativeTime(user.lastSeen)}
        </TableCell>

        {/* Joined */}
        <TableCell className="text-sm">{user.fmtCreatedAt}</TableCell>

        {/* Actions Dropdown */}
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
              <DropdownMenuItem onClick={() => setShowDetailsDialog(true)}>
                {t('viewDetails')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                {t('editUser')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleDisabled} disabled={toggling}>
                {user.isDisabled ? (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    {toggling ? t('saving') : t('enableAccount')}
                  </>
                ) : (
                  <>
                    <Ban className="mr-2 h-4 w-4" />
                    {toggling ? t('saving') : t('disableAccount')}
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
                {t('deleteUser')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <UserDetailsDialog user={user} open={showDetailsDialog} onOpenChange={setShowDetailsDialog} />
      <EditUserDialog user={user} open={showEditDialog} onOpenChange={setShowEditDialog} />
      <DeleteUserDialog
        userId={user.id}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </>
  );
};
