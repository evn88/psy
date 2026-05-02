'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { deleteUser } from '../actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface DeleteUserDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Диалог подтверждения удаления пользователя.
 * Использует next-intl для интернационализации.
 */
export const DeleteUserDialog = ({ userId, open, onOpenChange }: DeleteUserDialogProps) => {
  const t = useTranslations('Admin');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  /**
   * Выполняет удаление пользователя через server action.
   */
  const onDelete = async () => {
    setLoading(true);
    const result = await deleteUser(userId);
    setLoading(false);

    if (result.success) {
      onOpenChange(false);
      router.refresh();
    } else {
      console.error(result.error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteUserTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('deleteUserDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={e => {
              e.preventDefault();
              onDelete();
            }}
            disabled={loading}
          >
            {loading ? t('deleting') : t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
