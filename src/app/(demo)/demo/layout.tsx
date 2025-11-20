import type { Metadata } from 'next';
import { FC, ReactNode } from 'react';
import { Inter } from 'next/font/google';
import '../../globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Providers } from '@/shared/Providers';

const interFont = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Demo zone - vershkov.com',
  description: 'Demo zone'
};

type DemoLayoutType = Readonly<{
  children: ReactNode;
}>;

const DemoLayout: FC<DemoLayoutType> = ({ children }) => {
  return (
    <html lang="ru">
      <Providers>
        <body className={interFont.className} style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
          <main>{children}</main>
          <Analytics />
          <SpeedInsights />
        </body>
      </Providers>
    </html>
  );
};

export default DemoLayout;
