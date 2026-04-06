'use client';

import { type AnchorHTMLAttributes, type ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { getPathname } from '@/i18n/navigation';

interface DocumentLocaleLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'> {
  children: ReactNode;
  href: string;
}

/**
 * Рендерит locale-aware ссылку с полной навигацией документа.
 * Нужна для переходов из публичной части в защищённые разделы, где client-side RSC
 * может давать fallback при редиректах авторизации.
 * @param props - href, содержимое и стандартные атрибуты ссылки.
 * @returns Обычная `<a>` с локализованным href.
 */
const DocumentLocaleLink = ({ children, href, ...props }: DocumentLocaleLinkProps) => {
  const locale = useLocale();
  const currentLocale: AppLocale = isLocale(locale) ? locale : defaultLocale;
  const localizedHref = getPathname({
    href,
    locale: currentLocale
  });

  return (
    <a href={localizedHref} {...props}>
      {children}
    </a>
  );
};

export default DocumentLocaleLink;
