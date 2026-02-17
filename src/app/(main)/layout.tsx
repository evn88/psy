import type { Metadata } from 'next';
import '../globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { FC, ReactNode } from 'react';
import { Providers } from '@/shared/Providers';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { HeartbeatProvider } from '@/components/heartbeat-provider';

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

// Uncomment the navigation bar when the site is ready.
const RootLayout: FC<RootLayoutType> = ({ children }) => {
  return (
    <html lang="ru" suppressHydrationWarning>
      <Providers>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <HeartbeatProvider>
              {/*<Navbar />*/}
              <main className="px-4 md:px-0">{children}</main>
              <Analytics />
              <SpeedInsights />
            </HeartbeatProvider>
          </ThemeProvider>
        </body>
      </Providers>
    </html>
  );
};

export default RootLayout;
