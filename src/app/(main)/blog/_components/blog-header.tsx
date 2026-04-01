'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Home, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';

const LOCALES = ['ru', 'en', 'sr'] as const;
const LOCALE_LABELS: Record<string, string> = { ru: 'RU', en: 'EN', sr: 'SR' };

export function BlogHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  // useSyncExternalStore: на сервере возвращает false, на клиенте — true.
  // Избегаем useEffect + setState, которые нарушают react-hooks/set-state-in-effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentLang = searchParams.get('lang') ?? null;
  const isArticlePage = pathname !== '/blog';

  const handleLangSwitch = (locale: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('lang', locale);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border/60 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
        {/* Левая часть: домой / назад / название */}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-1"
            title="На главную"
          >
            <Home className="size-4" />
          </Link>
          <div className="w-px h-4 bg-border/60 mx-1" />
          {isArticlePage ? (
            <Link
              href="/blog"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors ml-1"
            >
              <ArrowLeft className="size-4 flex-shrink-0" />
              <span className="hidden sm:inline">Блог</span>
            </Link>
          ) : (
            <span className="text-sm font-semibold text-foreground ml-1">Блог</span>
          )}
        </div>

        {/* Правая часть: язык + тема */}
        <div className="flex items-center gap-3">
          {/* Переключатель языков */}
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            {LOCALES.map(loc => (
              <button
                key={loc}
                type="button"
                onClick={() => handleLangSwitch(loc)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
                  currentLang === loc
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {LOCALE_LABELS[loc]}
              </button>
            ))}
          </div>

          {/* Переключатель темы — рендерим нейтральную иконку до гидратации */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={
              mounted ? (resolvedTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема') : 'Сменить тему'
            }
          >
            {mounted && resolvedTheme === 'dark' ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
