import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getRequestConfig } from 'next-intl/server';
import { isLocale } from './config';
import { routing } from './routing';

/**
 * Загружает JSON перевода с диска.
 * В dev-режиме это позволяет подхватывать новые ключи без ручного рестарта сервера.
 * @param locale - активная локаль запроса.
 * @returns Объект переводов для next-intl.
 */
const loadMessages = async (locale: string): Promise<Record<string, unknown>> => {
  const messagesPath = join(process.cwd(), 'messages', `${locale}.json`);
  const file = await readFile(messagesPath, 'utf8');

  return JSON.parse(file) as Record<string, unknown>;
};

/**
 * Конфигурация запроса для next-intl.
 * Получает locale из сегмента `[locale]`, который нормализуется в `proxy.ts`.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale =
    requestedLocale && isLocale(requestedLocale) ? requestedLocale : routing.defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale)
  };
});
