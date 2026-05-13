'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { skipPilloIntakeAction, takePilloIntakeAction, undoPilloIntakeAction } from '../actions';
import { type PilloOptimisticAction, usePilloOptimistic } from './use-pillo-optimistic';

type IntakePendingAction = 'skip' | 'take' | 'undo';

const optimisticActionByPendingAction = {
  skip: 'skip_intake',
  take: 'take_intake',
  undo: 'undo_intake'
} satisfies Record<IntakePendingAction, PilloOptimisticAction['type']>;

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
    nextPendingAction: IntakePendingAction
  ) => {
    setPendingAction(nextPendingAction);

    startTransition(() => {
      if (addOptimisticAction) {
        addOptimisticAction({ type: optimisticActionByPendingAction[nextPendingAction], id });
      }

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
