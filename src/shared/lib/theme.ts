import type { Viewport } from 'next';

export const THEMES = ['light', 'dark', 'system'] as const;
export const RESOLVED_THEMES = ['light', 'dark'] as const;

export type Theme = (typeof THEMES)[number];
export type ResolvedTheme = (typeof RESOLVED_THEMES)[number];

export const DEFAULT_THEME: Theme = 'system';
export const THEME_COOKIE_NAME = 'theme';
export const THEME_STORAGE_KEY = 'theme';
export const THEME_ATTRIBUTES: ResolvedTheme[] = ['light', 'dark'];
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#ffffff',
  dark: '#0b0d12'
};

export const SYSTEM_THEME_COLORS: NonNullable<Viewport['themeColor']> = [
  { media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
  { media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark }
];

/**
 * Нормализует произвольное значение темы к поддерживаемому union-типу.
 * @param theme - исходное значение темы из cookie, storage или БД.
 * @param fallback - запасная тема, если значение не поддерживается.
 * @returns Валидная тема приложения.
 */
export const normalizeTheme = (
  theme: string | null | undefined,
  fallback: Theme = DEFAULT_THEME
): Theme => {
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return theme;
  }

  return fallback;
};

/**
 * Преобразует пользовательскую тему в итоговую визуальную схему.
 * @param theme - выбранная тема пользователя.
 * @param systemTheme - текущая системная тема устройства.
 * @param enableSystem - разрешено ли следовать системной теме.
 * @returns Итоговая светлая или тёмная тема.
 */
export const resolveTheme = (
  theme: Theme,
  systemTheme: ResolvedTheme,
  enableSystem: boolean
): ResolvedTheme => {
  if (theme === 'system' && enableSystem) {
    return systemTheme;
  }

  return theme === 'dark' ? 'dark' : 'light';
};

/**
 * Возвращает className для корневого html-элемента.
 * @param theme - тема пользователя.
 * @returns CSS-класс темы или `undefined` для системной темы.
 */
export const getThemeClassName = (theme: Theme): ResolvedTheme | undefined => {
  if (theme === 'system') {
    return undefined;
  }

  return theme;
};

/**
 * Возвращает `color-scheme` для viewport metadata.
 * @param theme - тема пользователя.
 * @returns Значение `color-scheme` для Next.js viewport.
 */
export const getViewportColorScheme = (theme: Theme): Viewport['colorScheme'] => {
  if (theme === 'system') {
    return 'light dark';
  }

  return theme;
};

/**
 * Возвращает `themeColor` для Next.js viewport metadata.
 * @param theme - тема пользователя.
 * @returns Одиночный цвет либо media-aware массив для системной темы.
 */
export const getViewportThemeColor = (theme: Theme): NonNullable<Viewport['themeColor']> => {
  if (theme === 'system') {
    return SYSTEM_THEME_COLORS;
  }

  return THEME_COLORS[theme];
};
