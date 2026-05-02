'use client';

import { useSurveySync } from '@/lib/hooks/use-survey-sync';

/**
 * Невидимый компонент — запускает автосинхронизацию офлайн-опросов.
 * Подключить один раз в layout /my.
 */
export function SurveySync() {
  useSurveySync();
  return null;
}
