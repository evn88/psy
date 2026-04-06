import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Dela_Gothic_One, Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import '../../globals.css';
import { defaultLocale, isLocale } from '@/i18n/config';
import { Providers } from '@/shared/Providers';
import { createBaseMetadata } from '@/shared/lib/seo';
import {
  DEFAULT_THEME,
  getThemeClassName,
  getViewportColorScheme,
  getViewportThemeColor,
  normalizeTheme,
  THEME_COOKIE_NAME
} from '@/shared/lib/theme';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap'
});

const delaGothicOne = Dela_Gothic_One({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-dela',
  weight: '400'
});

const sunlessDay = localFont({
  src: '../../fonts/SunlessDay.woff',
  variable: '--font-sunless-day',
  display: 'swap'
});

interface MainLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Возвращает базовые metadata для публичной части с учетом активной локали.
 * @param props - параметры layout, включая locale-сегмент.
 * @returns Базовые metadata уровня layout.
 */
export const generateMetadata = async ({ params }: MainLayoutProps): Promise<Metadata> => {
  const { locale } = await params;

  return createBaseMetadata(isLocale(locale) ? locale : defaultLocale);
};

/**
 * Генерирует viewport metadata согласно рекомендациям Next.js.
 * themeColor и color-scheme зависят от пользовательской cookie темы.
 * @returns Конфигурация viewport для браузерного chrome UI.
 */
export const generateViewport = async (): Promise<Viewport> => {
  const cookieStore = await cookies();
  const theme = normalizeTheme(cookieStore.get(THEME_COOKIE_NAME)?.value, DEFAULT_THEME);

  return {
    colorScheme: getViewportColorScheme(theme),
    themeColor: getViewportThemeColor(theme)
  };
};

/**
 * Корневой layout публичной части сайта.
 * Оставляет в серверном слое только locale, cookie и SSR-подготовку темы.
 * @param props - children и текущая locale из URL.
 * @returns HTML-обертка публичной части.
 */
const RootLayout = async ({ children, params }: Readonly<MainLayoutProps>) => {
  const { locale } = await params;
  const cookieStore = await cookies();

  if (!isLocale(locale)) {
    notFound();
  }

  const theme = normalizeTheme(cookieStore.get(THEME_COOKIE_NAME)?.value, DEFAULT_THEME);
  const themeClassName = getThemeClassName(theme);
  const htmlClassName = [
    inter.variable,
    sunlessDay.variable,
    delaGothicOne.variable,
    themeClassName
  ]
    .filter(Boolean)
    .join(' ');

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={htmlClassName}
      style={themeClassName ? { colorScheme: themeClassName } : undefined}
      data-scroll-behavior="smooth"
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers defaultTheme={theme}>
            <main>{children}</main>
            <Analytics />
            <SpeedInsights />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
