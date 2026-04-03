import type { Metadata } from 'next';
import { type ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Auth',
  robots: {
    index: false,
    follow: false
  }
};

/**
 * Технический layout для страницы авторизации.
 * Нужен, чтобы исключить auth-раздел из индексации.
 * @param props - дочерние элементы auth-сегмента.
 * @returns Дочернее дерево без дополнительной разметки.
 */
const AuthLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return children;
};

export default AuthLayout;
