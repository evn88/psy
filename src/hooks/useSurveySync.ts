'use client';

import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { submitSurveyResult } from '@/app/[locale]/(main)/my/surveys/actions';

export type PendingSurvey = {
  assignmentId: string;
  answers: Record<string, unknown>;
  savedAt: number;
};

const PENDING_KEY_PREFIX = 'pending_survey_';

export function getPendingSurveyKey(assignmentId: string) {
  return `${PENDING_KEY_PREFIX}${assignmentId}`;
}

/** Сохранить ответы опроса как pending (офлайн) */
export function savePendingSurvey(assignmentId: string, answers: Record<string, unknown>) {
  const data: PendingSurvey = { assignmentId, answers, savedAt: Date.now() };
  localStorage.setItem(getPendingSurveyKey(assignmentId), JSON.stringify(data));
}

/** Получить все pending опросы из localStorage */
export function getAllPendingSurveys(): PendingSurvey[] {
  const result: PendingSurvey[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PENDING_KEY_PREFIX)) {
      try {
        const val = localStorage.getItem(key);
        if (val) result.push(JSON.parse(val));
      } catch {
        // игнорируем невалидные записи
      }
    }
  }
  return result;
}

/** Удалить pending опрос */
export function removePendingSurvey(assignmentId: string) {
  localStorage.removeItem(getPendingSurveyKey(assignmentId));
}

/**
 * Хук автоматически синхронизирует pending опросы при восстановлении сети.
 * Подключить в layout /my.
 */
export function useSurveySync() {
  const syncPending = useCallback(async () => {
    const pending = getAllPendingSurveys();
    if (pending.length === 0) return;

    for (const { assignmentId, answers } of pending) {
      const result = await submitSurveyResult(assignmentId, answers);
      if (result.success) {
        removePendingSurvey(assignmentId);
        // Также удаляем черновик
        localStorage.removeItem(`survey_draft_${assignmentId}`);
        toast.success('Опрос синхронизирован', {
          description: 'Ваши ответы успешно отправлены.'
        });
      }
      // При ошибке — оставляем в localStorage, попробуем снова при следующем подключении
    }
  }, []);

  useEffect(() => {
    // Пробуем синхронизировать при монтировании (вдруг уже онлайн)
    if (navigator.onLine) {
      syncPending();
    }

    // Слушаем восстановление сети
    const handleOnline = () => syncPending();
    window.addEventListener('online', handleOnline);

    // Слушаем сообщение от Service Worker (Background Sync)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SURVEY_SYNC') {
        syncPending();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [syncPending]);
}
