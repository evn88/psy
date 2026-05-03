'use client';

import * as React from 'react';
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps as NextThemesProviderProps,
  useTheme as useNextTheme
} from 'next-themes';
import {
  DEFAULT_THEME,
  normalizeTheme,
  type ResolvedTheme,
  type Theme,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY
} from '@/lib/theme';

export type { ResolvedTheme, Theme } from '@/lib/theme';

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) {
      return;
    }
    orig.apply(console, args);
  };
}

interface ThemeProviderProps
  extends Pick<
    NextThemesProviderProps,
    | 'attribute'
    | 'children'
    | 'defaultTheme'
    | 'disableTransitionOnChange'
    | 'enableColorScheme'
    | 'enableSystem'
    | 'forcedTheme'
    | 'nonce'
    | 'scriptProps'
    | 'storageKey'
    | 'themes'
    | 'value'
  > {}

interface ThemeContextValue {
  forcedTheme?: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  systemTheme: ResolvedTheme;
  theme: Theme;
}

/**
 * Нормализует итоговую светлую/тёмную тему.
 * Для первой гидратации безопасно возвращает `light`, как и раньше в проекте.
 * @param theme - произвольное значение resolved/system theme.
 * @returns Нормализованная итоговая тема.
 */
const normalizeResolvedTheme = (
  theme: string | undefined,
  fallback: ResolvedTheme = 'light'
): ResolvedTheme => {
  return theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : fallback;
};

/**
 * Сохраняет выбранную тему в cookie, чтобы SSR мог сразу отдать корректные metadata.
 * @param theme - пользовательская тема.
 */
const persistThemeCookie = (theme: Theme): void => {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
};

/**
 * Синхронизирует значение темы из next-themes обратно в cookie для SSR.
 * @returns `null`, так как компонент не рендерит UI.
 */
const ThemeCookieSync = () => {
  const { theme } = useNextTheme();

  React.useEffect(() => {
    if (!theme) {
      return;
    }

    persistThemeCookie(normalizeTheme(theme, DEFAULT_THEME));
  }, [theme]);

  return null;
};

/**
 * Обёртка над next-themes для единой точки интеграции темы в проекте.
 * next-themes вставляет ранний script и выставляет класс темы до первого paint.
 * @param props - настройки темы и дочернее дерево.
 * @returns Провайдер темы приложения.
 */
export const ThemeProvider = ({
  attribute = 'data-theme',
  children,
  defaultTheme = DEFAULT_THEME,
  disableTransitionOnChange = false,
  enableColorScheme = true,
  enableSystem = true,
  storageKey = THEME_STORAGE_KEY,
  ...props
}: ThemeProviderProps) => {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      disableTransitionOnChange={disableTransitionOnChange}
      enableColorScheme={enableColorScheme}
      enableSystem={enableSystem}
      storageKey={storageKey}
      {...props}
    >
      <ThemeCookieSync />
      {children}
    </NextThemesProvider>
  );
};

/**
 * Типобезопасный доступ к теме приложения через локальную обёртку.
 * @returns Нормализованное API темы для клиентских компонентов.
 */
export const useTheme = (): ThemeContextValue => {
  const { forcedTheme, resolvedTheme, setTheme, systemTheme, theme } = useNextTheme();

  const memoizedSetTheme = React.useCallback(
    (nextTheme: Theme) => {
      setTheme(nextTheme);
    },
    [setTheme]
  );

  return React.useMemo(
    () => ({
      forcedTheme: forcedTheme ? normalizeTheme(forcedTheme, DEFAULT_THEME) : undefined,
      resolvedTheme: normalizeResolvedTheme(resolvedTheme),
      setTheme: memoizedSetTheme,
      systemTheme: normalizeResolvedTheme(systemTheme),
      theme: normalizeTheme(theme, DEFAULT_THEME)
    }),
    [forcedTheme, resolvedTheme, memoizedSetTheme, systemTheme, theme]
  );
};
