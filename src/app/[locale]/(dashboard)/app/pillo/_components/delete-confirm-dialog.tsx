'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

interface DeleteConfirmDialogProps {
  children: ReactNode;
  onConfirm: () => void;
  isPending?: boolean;
  pendingLabel?: string;
  title?: string;
  description?: string;
}

/**
 * Универсальный диалог подтверждения удаления.
 * @param props - дочерний элемент (триггер), обработчик подтверждения и тексты.
 * @returns Компонент AlertDialog.
 */
export const DeleteConfirmDialog = ({
  children,
  onConfirm,
  isPending,
  pendingLabel,
  title,
  description
}: DeleteConfirmDialogProps) => {
  const t = useTranslations('Pillo');

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="rounded-[1.5rem]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? t('common.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? t('common.deleteConfirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full" disabled={isPending}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (pendingLabel ?? t('common.deleting')) : t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
