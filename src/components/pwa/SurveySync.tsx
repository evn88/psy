'use client';

import { useSurveySync } from '@/hooks/useSurveySync';

/**
 * Невидимый компонент — запускает автосинхронизацию офлайн-опросов.
 * Подключить один раз в layout /my.
 */
export function SurveySync() {
  useSurveySync();
  return null;
}
