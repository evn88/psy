'use client';

import { useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Home, Moon, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import DocumentLocaleLink from '@/components/document-locale-link';
import { getPathname, Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { type AppLocale, isLocale } from '@/i18n/config';

const LOCALES = ['ru', 'en', 'sr'] as const;
const LOCALE_LABELS: Record<string, string> = { ru: 'RU', en: 'EN', sr: 'SR' };

/**
 * Выполняет полную навигацию документа при смене locale.
 * Это позволяет серверу пересобрать страницу с корректными metadata и locale-cookie.
 * @param href - относительный путь без locale-префикса.
 * @param locale - целевая locale.
 */
const navigateToLocaleDocument = (href: string, locale: AppLocale): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const targetPathname = getPathname({
    href,
    locale
  });

  window.location.assign(targetPathname);
};

export function BlogHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const currentLocale = useLocale();
  const t = useTranslations('Blog');
  // useSyncExternalStore: на сервере возвращает false, на клиенте — true.
  // Избегаем useEffect + setState, которые нарушают react-hooks/set-state-in-effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isArticlePage = pathname !== '/blog';

  const handleLangSwitch = (locale: string) => {
    if (!isLocale(locale)) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    navigateToLocaleDocument(href, locale);
  };

  return (
    <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border/60 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
        {/* Левая часть: домой / назад / название */}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-1"
            title={t('title')}
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
              <span className="hidden sm:inline">{t('backToBlog')}</span>
            </Link>
          ) : (
            <span className="text-sm font-semibold text-foreground ml-1">{t('title')}</span>
          )}
        </div>

        {/* Правая часть: язык + тема */}
        <div className="flex items-center gap-3">
          <DocumentLocaleLink
            href="/my"
            className="hidden rounded-md border border-border/70 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted sm:inline-flex"
          >
            {t('accountLink')}
          </DocumentLocaleLink>

          {/* Переключатель языков */}
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            {LOCALES.map(loc => (
              <button
                key={loc}
                type="button"
                onClick={() => handleLangSwitch(loc)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
                  currentLocale === loc
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
