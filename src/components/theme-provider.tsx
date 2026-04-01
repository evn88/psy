'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

type ThemeAttribute = `data-${string}` | 'class';

type ThemeValueMap = Record<string, string>;

type ThemeProviderProps = {
  children: ReactNode;
  themes?: string[];
  forcedTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  enableColorScheme?: boolean;
  storageKey?: string;
  defaultTheme?: string;
  attribute?: ThemeAttribute | ThemeAttribute[];
  value?: ThemeValueMap;
};

type SetThemeInput = string | ((currentTheme: string) => string);

type ThemeContextValue = {
  themes: string[];
  forcedTheme?: string;
  theme: string;
  resolvedTheme: string;
  systemTheme: 'light' | 'dark';
  setTheme: (theme: SetThemeInput) => void;
};

const DEFAULT_THEMES = ['light', 'dark'];
const THEME_STORAGE_DEFAULT_KEY = 'theme';
const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Возвращает текущую системную тему.
 * @returns `dark`, если включён тёмный режим системы, иначе `light`.
 */
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia(THEME_MEDIA_QUERY).matches ? 'dark' : 'light';
};

/**
 * Читает тему из localStorage.
 * @param storageKey - ключ localStorage.
 * @returns Сохранённая тема либо `null`, если значение отсутствует.
 */
const readStoredTheme = (storageKey: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(storageKey);
  } catch (error) {
    console.error('Не удалось прочитать тему из localStorage:', error);
    return null;
  }
};

/**
 * Сохраняет тему в localStorage.
 * @param storageKey - ключ localStorage.
 * @param theme - выбранная тема.
 */
const writeStoredTheme = (storageKey: string, theme: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, theme);
  } catch (error) {
    console.error('Не удалось сохранить тему в localStorage:', error);
  }
};

/**
 * Временно отключает CSS-transition при переключении темы.
 * @returns Функция очистки, восстанавливающая transition.
 */
const disableTransitionsTemporarily = (): (() => void) => {
  const style = document.createElement('style');
  style.textContent =
    '*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}';
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    setTimeout(() => {
      document.head.removeChild(style);
    }, 1);
  };
};

/**
 * Нормализует тему с учётом режима `system`.
 * @param params - параметры нормализации.
 * @returns Итоговая тема для применения к DOM.
 */
const resolveTheme = (params: {
  theme: string;
  enableSystem: boolean;
  systemTheme: 'light' | 'dark';
}): string => {
  if (params.theme === 'system' && params.enableSystem) {
    return params.systemTheme;
  }

  return params.theme;
};

/**
 * Провайдер темы без инлайн-скриптов в React-дереве.
 * @param props - настройки провайдера.
 * @returns JSX-провайдер темы.
 */
export const ThemeProvider = ({
  children,
  themes = DEFAULT_THEMES,
  forcedTheme,
  enableSystem = true,
  disableTransitionOnChange = false,
  enableColorScheme = true,
  storageKey = THEME_STORAGE_DEFAULT_KEY,
  defaultTheme,
  attribute = 'data-theme',
  value
}: ThemeProviderProps) => {
  const fallbackTheme = defaultTheme ?? (enableSystem ? 'system' : 'light');
  const [theme, setThemeState] = useState<string>(
    () => readStoredTheme(storageKey) ?? fallbackTheme
  );
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  const applyThemeToDocument = useCallback(
    (nextTheme: string): void => {
      if (typeof document === 'undefined') {
        return;
      }

      const effectiveTheme = resolveTheme({
        theme: nextTheme,
        enableSystem,
        systemTheme
      });

      const restoreTransitions = disableTransitionOnChange ? disableTransitionsTemporarily() : null;
      const targetAttributes = Array.isArray(attribute) ? attribute : [attribute];
      const themeClassNames = themes.map(item => value?.[item] ?? item);
      const root = document.documentElement;

      targetAttributes.forEach(currentAttribute => {
        if (currentAttribute === 'class') {
          root.classList.remove(...themeClassNames);
          const mappedClassName = value?.[effectiveTheme] ?? effectiveTheme;
          if (mappedClassName) {
            root.classList.add(mappedClassName);
          }
          return;
        }

        const mappedValue = value?.[effectiveTheme] ?? effectiveTheme;
        if (mappedValue) {
          root.setAttribute(currentAttribute, mappedValue);
        } else {
          root.removeAttribute(currentAttribute);
        }
      });

      if (enableColorScheme) {
        const colorScheme =
          effectiveTheme === 'dark' || effectiveTheme === 'light' ? effectiveTheme : '';
        root.style.colorScheme = colorScheme;
      }

      restoreTransitions?.();
    },
    [
      attribute,
      disableTransitionOnChange,
      enableColorScheme,
      enableSystem,
      systemTheme,
      themes,
      value
    ]
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);

    const handleSystemThemeChange = (): void => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    handleSystemThemeChange();
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== storageKey) {
        return;
      }

      if (event.newValue) {
        setThemeState(event.newValue);
      } else {
        setThemeState(fallbackTheme);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [fallbackTheme, storageKey]);

  const activeTheme = forcedTheme ?? theme;

  useEffect(() => {
    applyThemeToDocument(activeTheme);
  }, [activeTheme, applyThemeToDocument]);

  /**
   * Обновляет тему и синхронизирует её в localStorage.
   * @param input - тема или функция-переключатель.
   */
  const setTheme = useCallback(
    (input: SetThemeInput): void => {
      if (forcedTheme) {
        return;
      }

      setThemeState(currentTheme => {
        const nextTheme = typeof input === 'function' ? input(currentTheme) : input;
        writeStoredTheme(storageKey, nextTheme);
        return nextTheme;
      });
    },
    [forcedTheme, storageKey]
  );

  const resolvedTheme = resolveTheme({
    theme: activeTheme,
    enableSystem,
    systemTheme
  });

  const contextValue = useMemo<ThemeContextValue>(() => {
    return {
      themes: enableSystem ? [...themes, 'system'] : themes,
      forcedTheme,
      theme: activeTheme,
      resolvedTheme,
      systemTheme,
      setTheme
    };
  }, [activeTheme, enableSystem, forcedTheme, resolvedTheme, setTheme, systemTheme, themes]);

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

/**
 * Хук доступа к состоянию темы приложения.
 * @returns API темы (`theme`, `resolvedTheme`, `setTheme` и т.д.).
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme должен использоваться внутри ThemeProvider');
  }

  return context;
};
