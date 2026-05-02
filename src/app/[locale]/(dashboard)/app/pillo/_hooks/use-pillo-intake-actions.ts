'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { skipPilloIntakeAction, takePilloIntakeAction, undoPilloIntakeAction } from '../actions';

/**
 * Хук для выполнения действий над приёмами (принять/пропустить).
 * @returns Состояние загрузки и функции действий.
 */
export const usePilloIntakeActions = () => {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('Pillo');

  /**
   * Выполняет действие с использованием transition и показывает ошибку пользователю.
   * @param action - server action для обработки приёма.
   */
  const runAction = (
    action: () => Promise<{ error?: string; success?: boolean }>,
    fallbackErrorMessage: string
  ) => {
    startTransition(() => {
      void action()
        .then(result => {
          if (result.error) {
            toast.error(result.error);
            return;
          }

          if (!result.success) {
            toast.error(fallbackErrorMessage);
          }
        })
        .catch(() => {
          toast.error(fallbackErrorMessage);
        });
    });
  };

  const onTake = (id: string) => runAction(() => takePilloIntakeAction(id), t('today.takeError'));
  const onSkip = (id: string) => runAction(() => skipPilloIntakeAction(id), t('today.skipError'));
  const onUndo = (id: string) => runAction(() => undoPilloIntakeAction(id), t('today.undoError'));

  return {
    isPending,
    onTake,
    onSkip,
    onUndo
  };
};
