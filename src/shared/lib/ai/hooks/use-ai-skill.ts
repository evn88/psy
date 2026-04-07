'use client';

import { useCallback, useState, useTransition } from 'react';
import type { AiSkillPromptOverrides } from '../ai-contracts';
import { AI_MODEL_CATALOG, type AiModelId } from '../ai-model-catalog';
import { AI_SKILL_MANIFEST, type AiSkillId } from '../ai-skill-manifest';

type UseAiSkillState<TData> =
  | {
      status: 'idle';
      data: null;
      error: null;
    }
  | {
      status: 'loading';
      data: TData | null;
      error: null;
    }
  | {
      status: 'success';
      data: TData;
      error: null;
    }
  | {
      status: 'error';
      data: TData | null;
      error: string;
    };

interface RunAiSkillOptions<TInput, TContext> {
  input: TInput;
  context?: TContext;
  modelId?: AiModelId;
  overrides?: AiSkillPromptOverrides;
  signal?: AbortSignal;
}

interface UseAiSkillOptions<TData> {
  skillId: AiSkillId;
  endpoint?: string;
  onSuccess?: (data: TData) => void;
  onError?: (errorMessage: string) => void;
}

/**
 * Универсальный клиентский хук для запуска AI-навыков через общий API-контракт.
 *
 * @param options Конфигурация навыка и lifecycle callbacks.
 * @returns Состояние вызова навыка, его метаданные и функцию `run`.
 */
export const useAiSkill = <TInput, TData, TContext = undefined>({
  skillId,
  endpoint,
  onSuccess,
  onError
}: UseAiSkillOptions<TData>) => {
  const descriptor = AI_SKILL_MANIFEST[skillId];
  const [state, setState] = useState<UseAiSkillState<TData>>({
    status: 'idle',
    data: null,
    error: null
  });
  const [isTransitionPending, startTransition] = useTransition();

  /**
   * Выполняет AI-навык с произвольным входным payload.
   *
   * @param options Данные запроса и runtime-override.
   * @returns Результат выполнения навыка.
   */
  const run = useCallback(
    async ({ input, context, modelId, overrides, signal }: RunAiSkillOptions<TInput, TContext>) => {
      setState(previousState => ({
        status: 'loading',
        data: previousState.data,
        error: null
      }));

      try {
        const response = await fetch(endpoint ?? `/api/admin/ai/skills/${skillId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input,
            context,
            modelId,
            overrides
          }),
          signal
        });
        const payload = (await response.json()) as { data?: TData; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? 'Не удалось выполнить AI-навык');
        }

        const nextData = payload.data as TData;

        startTransition(() => {
          setState({
            status: 'success',
            data: nextData,
            error: null
          });
        });

        onSuccess?.(nextData);

        return nextData;
      } catch (error) {
        if (signal?.aborted) {
          throw error;
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Не удалось выполнить AI-навык';

        startTransition(() => {
          setState(previousState => ({
            status: 'error',
            data: previousState.data,
            error: errorMessage
          }));
        });

        onError?.(errorMessage);

        throw error instanceof Error ? error : new Error(errorMessage);
      }
    },
    [endpoint, onError, onSuccess, skillId]
  );

  /**
   * Сбрасывает локальное состояние навыка к начальному.
   */
  const reset = useCallback(() => {
    startTransition(() => {
      setState({
        status: 'idle',
        data: null,
        error: null
      });
    });
  }, []);

  return {
    ...state,
    descriptor,
    availableModels: descriptor.availableModelIds.map(modelId => AI_MODEL_CATALOG[modelId]),
    isPending: state.status === 'loading' || isTransitionPending,
    run,
    reset
  };
};
