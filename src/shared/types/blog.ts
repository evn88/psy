import type {
  BlogPost,
  BlogPostTranslation,
  BlogCategory,
  BlogPostStatus,
  User
} from '@prisma/client';
import type { AppLocale } from '@/i18n/config';

export type { BlogPostStatus };
export type { AppLocale as BlogLocale };

export interface BlogPostWithTranslations extends BlogPost {
  translations: BlogPostTranslation[];
  categories: Array<{
    category: BlogCategory;
  }>;
  author: Pick<User, 'id' | 'name' | 'image'>;
}

export interface BlogPostSummary {
  id: string;
  slug: string;
  status: BlogPostStatus;
  coverImage: string | null;
  readingTime: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorName: string | null;
  authorImage: string | null;
  translation: {
    locale: string;
    title: string;
    description: string;
  } | null;
  categories: Array<{
    id: string;
    slug: string;
    name: Record<string, string>;
  }>;
}

export interface BlogCategoryWithName extends BlogCategory {
  name: Record<string, string>;
}

export interface BlogTranslationInput {
  locale: string;
  title: string;
  description: string;
  content: string;
}

