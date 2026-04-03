import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { type ReactNode } from 'react';
import '../../../globals.css';
import { Providers } from '@/shared/Providers';
import { isLocale } from '@/i18n/config';

const interFont = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Demo zone',
  description: 'Demo zone',
  robots: {
    index: false,
    follow: false
  }
};

type DemoLayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>;

/**
 * Root layout demo-зоны.
 * Сегмент исключен из индексации и использует locale из URL.
 * @param props - children и locale маршрута.
 * @returns HTML-обертка demo-зоны.
 */
const DemoLayout = async ({ children, params }: DemoLayoutProps) => {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body className={interFont.className} style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        <Providers>
          <main>{children}</main>
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
};

export default DemoLayout;
