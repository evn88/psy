'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { skipPilloIntakeAction, takePilloIntakeAction, undoPilloIntakeAction } from '../actions';
import { usePilloOptimistic } from './use-pillo-optimistic';

/**
 * Хук для выполнения действий над приёмами (принять/пропустить).
 * @returns Состояние загрузки и функции действий.
 */
export const usePilloIntakeActions = () => {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<'skip' | 'take' | 'undo' | null>(null);
  const addOptimisticAction = usePilloOptimistic();
  const t = useTranslations('Pillo');

  /**
   * Выполняет действие с использованием transition и показывает ошибку пользователю.
   * @param id - идентификатор приёма
   * @param action - server action для обработки приёма.
   */
  const runAction = (
    id: string,
    action: () => Promise<{ error?: string; success?: boolean }>,
    fallbackErrorMessage: string,
    nextPendingAction: 'skip' | 'take' | 'undo'
  ) => {
    setPendingAction(nextPendingAction);

    // Оптимистичное обновление интерфейса мгновенно
    if (addOptimisticAction) {
      addOptimisticAction({ type: `${nextPendingAction}_intake` as any, id });
    }

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
    runAction(id, () => takePilloIntakeAction(id), t('today.takeError'), 'take');
  const onSkip = (id: string) =>
    runAction(id, () => skipPilloIntakeAction(id), t('today.skipError'), 'skip');
  const onUndo = (id: string) =>
    runAction(id, () => undoPilloIntakeAction(id), t('today.undoError'), 'undo');

  return {
    isPending,
    pendingAction,
    onTake,
    onSkip,
    onUndo
  };
};
