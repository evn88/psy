import type { BlogEditorLocale } from './blog-editor-form.types';

export const ALL_BLOG_EDITOR_LOCALES: BlogEditorLocale[] = ['ru', 'en', 'sr'];

export const BLOG_EDITOR_LOCALE_TAB_LABELS: Record<BlogEditorLocale, string> = {
  ru: 'RU',
  en: 'EN',
  sr: 'SR'
};

export const BLOG_EDITOR_LOCALE_NAMES: Record<BlogEditorLocale, string> = {
  ru: 'Русский',
  en: 'English',
  sr: 'Srpski'
};
