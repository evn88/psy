import type { Metadata } from 'next';
import '../globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { FC, ReactNode } from 'react';
import { Providers } from '@/shared/Providers';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { ThemeProvider } from '@/components/theme-provider';
import { HeartbeatProvider } from '@/components/heartbeat-provider';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap'
});

const sunlessDay = localFont({
  src: '../fonts/SunlessDay.woff',
  variable: '--font-sunless-day',
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

// Uncomment the navigation bar when the site is ready.
const RootLayout: FC<RootLayoutType> = async ({ children }) => {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${sunlessDay.variable}`}
    >
      <Providers>
        <body>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <HeartbeatProvider>
                {/*<Navbar />*/}
                <main>{children}</main>
                <Analytics />
                <SpeedInsights />
              </HeartbeatProvider>
              <Toaster position="bottom-right" richColors closeButton />
            </ThemeProvider>
          </NextIntlClientProvider>
        </body>
      </Providers>
    </html>
  );
};

export default RootLayout;
