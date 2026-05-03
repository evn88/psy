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

/**
 * Рисует подтверждение добавления упаковки.
 * @param props - trigger и обработчик подтверждения.
 * @returns Диалог подтверждения.
 */
export const AddPackageConfirmDialog = ({
  children,
  isPending,
  onConfirm
}: {
  children: ReactNode;
  isPending?: boolean;
  onConfirm: () => void;
}) => {
  const t = useTranslations('Pillo');

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="rounded-[1.5rem]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('medications.addPackageConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('medications.addPackageConfirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full" disabled={isPending}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPending ? t('medications.addPackagePending') : t('medications.addPackageBtn')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
