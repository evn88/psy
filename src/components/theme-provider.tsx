'use client';

import * as React from 'react';
import {
  DEFAULT_THEME,
  normalizeTheme,
  type ResolvedTheme,
  resolveTheme,
  type Theme,
  THEME_ATTRIBUTES,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY
} from '@/shared/lib/theme';

export type { ResolvedTheme, Theme } from '@/shared/lib/theme';

interface ThemeProviderProps {
  attribute?: string;
  children: React.ReactNode;
  defaultTheme?: Theme;
  disableTransitionOnChange?: boolean;
  enableColorScheme?: boolean;
  enableSystem?: boolean;
  forcedTheme?: Theme;
  storageKey?: string;
  value?: Record<string, string>;
}

interface ThemeContextValue {
  forcedTheme?: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  systemTheme: ResolvedTheme;
  theme: Theme;
}

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

/**
 * Возвращает системную тему пользователя.
 * На сервере безопасно падает в `light`, чтобы не ломать SSR.
 * @returns Текущая системная тема.
 */
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
};

/**
 * Временно отключает CSS transitions, чтобы смена темы не мигала.
 * @returns Функция отката временного style-тега.
 */
const disableTransitions = (): (() => void) => {
  const style = document.createElement('style');
  style.appendChild(
    document.createTextNode(
      '*,*::before,*::after{-webkit-transition:none!important;transition:none!important}'
    )
  );

  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    window.setTimeout(() => {
      document.head.removeChild(style);
    }, 1);
  };
};

/**
 * Применяет текущую тему к `document.documentElement`.
 * @param attribute - HTML-атрибут, в который записывается тема.
 * @param resolvedTheme - итоговая визуальная тема.
 * @param enableColorScheme - нужно ли синхронизировать CSS `color-scheme`.
 * @param value - маппинг theme -> DOM value.
 * @param disableTransitionOnChange - временно отключать transitions во время смены темы.
 */
const applyTheme = ({
  attribute,
  resolvedTheme,
  enableColorScheme,
  value,
  disableTransitionOnChange
}: {
  attribute: string;
  disableTransitionOnChange: boolean;
  enableColorScheme: boolean;
  resolvedTheme: ResolvedTheme;
  value?: Record<string, string>;
}): void => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const nextValue = value?.[resolvedTheme] ?? resolvedTheme;
  const rollbackTransitions = disableTransitionOnChange ? disableTransitions() : null;

  if (attribute === 'class') {
    root.classList.remove(...THEME_ATTRIBUTES);
    root.classList.add(nextValue);
  } else {
    root.setAttribute(attribute, nextValue);
  }

  if (enableColorScheme) {
    root.style.colorScheme = resolvedTheme;
  }

  rollbackTransitions?.();
};

/**
 * Сохраняет выбранную тему в cookie для SSR и viewport metadata.
 * @param theme - тема пользователя.
 */
const persistThemeCookie = (theme: Theme): void => {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
};

/**
 * Локальный ThemeProvider без inline script.
 * Он синхронизирует тему с cookie и storage, чтобы SSR и viewport работали предсказуемо.
 * @param props - настройки темы и дочернее дерево.
 * @returns Контекст темы для клиентских компонентов.
 */
export const ThemeProvider = ({
  attribute = 'data-theme',
  children,
  defaultTheme = DEFAULT_THEME,
  disableTransitionOnChange = false,
  enableColorScheme = true,
  enableSystem = true,
  forcedTheme,
  storageKey = THEME_STORAGE_KEY,
  value
}: ThemeProviderProps) => {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>('light');

  React.useEffect(() => {
    const persistedTheme =
      typeof window === 'undefined' ? null : window.localStorage.getItem(storageKey);
    const nextSystemTheme = getSystemTheme();
    const nextTheme = normalizeTheme(persistedTheme, defaultTheme);

    setSystemTheme(nextSystemTheme);
    setThemeState(nextTheme);

    if (persistedTheme !== nextTheme) {
      window.localStorage.setItem(storageKey, nextTheme);
    }

    persistThemeCookie(nextTheme);
  }, [defaultTheme, storageKey]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MEDIA_QUERY);

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      const normalizedTheme = normalizeTheme(nextTheme, defaultTheme);

      setThemeState(normalizedTheme);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, normalizedTheme);
      }

      persistThemeCookie(normalizedTheme);
    },
    [defaultTheme, storageKey]
  );

  const effectiveTheme = forcedTheme ?? theme;
  const resolvedTheme = resolveTheme(effectiveTheme, systemTheme, enableSystem);

  React.useEffect(() => {
    applyTheme({
      attribute,
      resolvedTheme,
      enableColorScheme,
      value,
      disableTransitionOnChange
    });
  }, [attribute, disableTransitionOnChange, enableColorScheme, resolvedTheme, value]);

  const contextValue = React.useMemo<ThemeContextValue>(
    () => ({
      forcedTheme,
      resolvedTheme,
      setTheme,
      systemTheme,
      theme
    }),
    [forcedTheme, resolvedTheme, setTheme, systemTheme, theme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

/**
 * Хук доступа к теме приложения.
 * @returns API темы для клиентских компонентов.
 */
export const useTheme = (): ThemeContextValue => {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
};
