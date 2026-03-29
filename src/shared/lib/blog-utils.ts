import slugify from 'slugify';
import type { BlogLocale } from '@/shared/types/blog';

/**
 * Вычисляет примерное время чтения в минутах.
 * Скорость чтения: ~200 слов в минуту.
 */
export function calculateReadingTime(content: string): number {
  // Убираем markdown-разметку
  const plainText = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_~>]/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  const words = plainText.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Генерирует URL-безопасный slug из заголовка (поддерживает кириллицу).
 */
export function generateSlug(title: string): string {
  return slugify(title, {
    lower: true,
    strict: true,
    locale: 'ru',
    trim: true
  });
}

/**
 * Возвращает локаль для блога с откатом на русский.
 */
export function getBlogLocale(locale: string, availableLocales: string[]): BlogLocale {
  if (availableLocales.includes(locale)) {
    return locale as BlogLocale;
  }
  return 'ru';
}

/**
 * Форматирует дату статьи для отображения.
 */
export function formatBlogDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'sr' ? 'sr-RS' : locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

/**
 * Извлекает описание из контента (первый абзац).
 */
export function extractDescription(content: string, maxLength = 160): string {
  const firstParagraph =
    content
      .replace(/#{1,6}\s[^\n]*/g, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`~]/g, '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)[0] ?? '';

  return firstParagraph.length > maxLength
    ? firstParagraph.slice(0, maxLength).trimEnd() + '…'
    : firstParagraph;
}
