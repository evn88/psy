import type { BlogCategory } from '@prisma/client';

export type BlogEditorLocale = 'ru' | 'en' | 'sr';
export type BlogEditorStatus = 'DRAFT' | 'PUBLISHED';

export interface EditorTranslation {
  locale: BlogEditorLocale;
  title: string;
  description: string;
  content: string;
}

export interface BlogAuthorOption {
  id: string;
  name: string | null;
  email: string | null;
}

export interface BlogEditorVersion {
  id: string;
  savedAt: string;
  translations: EditorTranslation[];
  categoryIds: string[];
  coverImage: string | null;
}

export type BlogEditorCategory = BlogCategory & {
  name: Record<string, string>;
};

export interface BlogEditorInitialData {
  postId: string;
  slug: string;
  status: BlogEditorStatus;
  coverImage: string | null;
  translations: EditorTranslation[];
  categoryIds: string[];
  authorId: string;
  categories: BlogEditorCategory[];
  authors: BlogAuthorOption[];
}
