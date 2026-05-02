'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { HeartbeatProvider } from '@/components/heartbeat-provider';
import { OfflineIndicator } from '@/components/pwa/offline-indicator';
import { PushPermissionBanner } from '@/components/pwa/push-permission-banner';
import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration';
import { ThemeProvider } from '@/components/theme-provider';
import type { Theme } from '@/lib/theme';

interface ProvidersProps {
  children: ReactNode;
  defaultTheme: Theme;
}

/**
 * Объединяет клиентские провайдеры и глобальные UI-интеграции.
 * Layout остаётся серверным и передаёт сюда только подготовленные SSR-данные.
 * @param props - дочернее дерево и тема по умолчанию из cookie.
 * @returns Клиентская обёртка над общими провайдерами приложения.
 */
export const Providers = ({ children, defaultTheme }: ProvidersProps) => {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme={defaultTheme}
        enableSystem
        disableTransitionOnChange
      >
        <HeartbeatProvider>{children}</HeartbeatProvider>
        <Toaster position="bottom-right" richColors closeButton />
        <OfflineIndicator />
        <PushPermissionBanner />
        <ServiceWorkerRegistration />
      </ThemeProvider>
    </SessionProvider>
  );
};
