import type { Metadata } from 'next';
import '../globals.css';
import { Navbar } from '@/widgets/Navbar';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { FC, ReactNode } from 'react';
import { Providers } from '@/shared/Providers';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'vershkov.com',
  description: 'Psychologist',
  appleWebApp: {
    title: 'Vershkov',
    statusBarStyle: 'default', // или "black-translucent"
    capable: true // добавит apple-mobile-web-app-capable
  }
};

type RootLayoutType = Readonly<{
  children: ReactNode;
}>;

const RootLayout: FC<RootLayoutType> = ({ children }) => {
  return (
    <html lang="ru">
      <Providers>
        <body className={inter.className}>
          <Navbar />
          <main className="pt-4 px-4 md:px-0">{children}</main>
          <Analytics />
          <SpeedInsights />
        </body>
      </Providers>
    </html>
  );
};

export default RootLayout;
