'use client';

import { useTransition } from 'react';
import { skipPilloIntakeAction, takePilloIntakeAction } from '../actions';

/**
 * Хук для выполнения действий над приёмами (принять/пропустить).
 * @returns Состояние загрузки и функции действий.
 */
export const usePilloIntakeActions = () => {
  const [isPending, startTransition] = useTransition();

  /**
   * Выполняет действие с использованием transition.
   */
  const runAction = (action: () => Promise<unknown>) => {
    startTransition(() => {
      void action();
    });
  };

  const onTake = (id: string) => runAction(() => takePilloIntakeAction(id));
  const onSkip = (id: string) => runAction(() => skipPilloIntakeAction(id));

  return {
    isPending,
    onTake,
    onSkip
  };
};
