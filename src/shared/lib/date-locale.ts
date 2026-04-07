import { enUS, ru, sr } from 'date-fns/locale';
import type { AppLocale } from '@/i18n/config';

/**
 * Маппинг AppLocale на date-fns локали для форматирования дат.
 * @param locale - локаль приложения
 * @returns соответствующая локаль для date-fns
 */
export const getDateFnsLocale = (locale: AppLocale) => {
  switch (locale) {
    case 'ru':
      return ru;
    case 'en':
      return enUS;
    case 'sr':
      return sr;
    default:
      return enUS;
  }
};
