'use client';

import { Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  BLOG_EDITOR_LOCALE_CODES,
  BLOG_EDITOR_LOCALE_MESSAGE_KEYS
} from './blog-editor-form.constants';
import type { BlogEditorLocale, EditorTranslation } from './blog-editor-form.types';

interface BlogEditorLocaleTabsProps {
  translations: EditorTranslation[];
  activeLocale: BlogEditorLocale;
  onSelectLocale: (locale: BlogEditorLocale) => void;
  isPending: boolean;
}

/**
 * Отображает переключатель локалей статьи.
 *
 * @param props Набор переводов, активная локаль и обработчик переключения.
 * @returns Навигацию по локалям редактора.
 */
export const BlogEditorLocaleTabs = ({
  translations,
  activeLocale,
  onSelectLocale,
  isPending
}: BlogEditorLocaleTabsProps) => {
  const tBlog = useTranslations('Admin.blog');

  return (
    <div className="flex items-center gap-1">
      {translations.map(translation => (
        <button
          key={translation.locale}
          type="button"
          onClick={() => onSelectLocale(translation.locale)}
          aria-pressed={activeLocale === translation.locale}
          className={`-mb-px flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition-all ${
            activeLocale === translation.locale
              ? 'border-[#900A0B] bg-[#900A0B]/5 text-[#900A0B]'
              : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          } ${isPending ? 'opacity-70' : ''}`}
        >
          <Globe className="size-3.5" />
          <span>{BLOG_EDITOR_LOCALE_CODES[translation.locale]}</span>
          <span className="sr-only">
            {tBlog(BLOG_EDITOR_LOCALE_MESSAGE_KEYS[translation.locale])}
          </span>
          {translation.title && (
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
          )}
        </button>
      ))}
    </div>
  );
};
