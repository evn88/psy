'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { skipPilloIntakeAction, takePilloIntakeAction, undoPilloIntakeAction } from '../actions';

/**
 * Хук для выполнения действий над приёмами (принять/пропустить).
 * @returns Состояние загрузки и функции действий.
 */
export const usePilloIntakeActions = () => {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<'skip' | 'take' | 'undo' | null>(null);
  const t = useTranslations('Pillo');

  /**
   * Выполняет действие с использованием transition и показывает ошибку пользователю.
   * @param action - server action для обработки приёма.
   */
  const runAction = (
    action: () => Promise<{ error?: string; success?: boolean }>,
    fallbackErrorMessage: string,
    nextPendingAction: 'skip' | 'take' | 'undo'
  ) => {
    setPendingAction(nextPendingAction);
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
        })
        .finally(() => {
          setPendingAction(null);
        });
    });
  };

  const onTake = (id: string) =>
    runAction(() => takePilloIntakeAction(id), t('today.takeError'), 'take');
  const onSkip = (id: string) =>
    runAction(() => skipPilloIntakeAction(id), t('today.skipError'), 'skip');
  const onUndo = (id: string) =>
    runAction(() => undoPilloIntakeAction(id), t('today.undoError'), 'undo');

  return {
    isPending,
    pendingAction,
    onTake,
    onSkip,
    onUndo
  };
};
