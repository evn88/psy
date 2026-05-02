'use client';

import { useTheme } from '@/components/ThemeProvider';
import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import styles from '@/styles/landing/landing.module.css';

// Пустая подписка для статического стора
const emptySubscribe = () => () => {};

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  // Идеальный паттерн React 18+ для избежания конфликтов гидратации
  // без использования useEffect и setState, вызывающих strict-mode warnings.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={styles.themeToggle}
      aria-label="Toggle theme"
      disabled={!mounted}
    >
      {mounted ? (
        theme === 'dark' ? (
          <Sun
            className={styles.themeToggleIcon}
            style={{ color: 'var(--color-pink)' }}
            strokeWidth={1.5}
          />
        ) : (
          <Moon
            className={styles.themeToggleIcon}
            style={{ color: 'var(--color-blue)' }}
            strokeWidth={1.5}
          />
        )
      ) : (
        <div className={styles.themeToggleIcon} /> /* Placeholder space */
      )}
    </button>
  );
};
