'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

/**
 * Обёртка над next-themes ThemeProvider.
 * @param props - пропсы next-themes провайдера.
 * @returns Провайдер темы.
 */
export const ThemeProvider = ({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) => {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
};

export { useTheme };
