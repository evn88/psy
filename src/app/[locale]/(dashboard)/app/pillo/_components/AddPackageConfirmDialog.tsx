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
} from '@/components/ui/AlertDialog';

/**
 * Рисует подтверждение добавления упаковки.
 * @param props - trigger и обработчик подтверждения.
 * @returns Диалог подтверждения.
 */
export const AddPackageConfirmDialog = ({
  children,
  onConfirm
}: {
  children: ReactNode;
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
          <AlertDialogCancel className="rounded-full">{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t('medications.addPackageBtn')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
