import { locales } from '@/i18n/config';
import type { BlogEditorLocale } from './blog-editor-form.types';

export const ALL_BLOG_EDITOR_LOCALES = locales satisfies BlogEditorLocale[];

export const BLOG_EDITOR_LOCALE_CODES: Record<BlogEditorLocale, string> = {
  ru: 'RU',
  en: 'EN',
  sr: 'SR'
};

export const BLOG_EDITOR_LOCALE_MESSAGE_KEYS = {
  ru: 'langRu',
  en: 'langEn',
  sr: 'langSr'
} as const satisfies Record<BlogEditorLocale, 'langRu' | 'langEn' | 'langSr'>;

export const BLOG_EDITOR_META_FIELD_CLASS_NAME =
  'rounded-xl border-input bg-card shadow-sm transition-[border-color,box-shadow] focus-visible:border-[#900A0B]/40 focus-visible:ring-2 focus-visible:ring-[#900A0B]/20 focus-visible:ring-offset-0';

export const BLOG_EDITOR_VIEW_MODE_TARGET_ID = 'mdx-editor-view-mode';

export const BLOG_EDITOR_EMPTY_PREVIEW_ICON_CLASS_NAME = 'size-10 opacity-20';
