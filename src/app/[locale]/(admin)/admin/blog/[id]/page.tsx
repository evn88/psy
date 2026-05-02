import { notFound } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { BlogEditorForm } from './_components/blog-editor-form';
import type {
  BlogEditorCategory,
  BlogEditorInitialData,
  BlogEditorLocale
} from './_components/blog-editor-form.types';

interface Props {
  params: Promise<{ id: string }>;
}

type BlogEditorPostRecord = Prisma.BlogPostGetPayload<{
  include: {
    translations: true;
    categories: {
      include: {
        category: true;
      };
    };
  };
}>;

type BlogEditorAuthorRecord = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
  };
}>;

/**
 * Нормализует json-поле с локализованным названием категории.
 *
 * @param value Значение из Prisma.
 * @returns Словарь локализованных подписей.
 */
const normalizeCategoryName = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, localizedValue]) => typeof localizedValue === 'string')
  ) as Record<string, string>;
};

/**
 * Проверяет, поддерживается ли локаль редактором статьи.
 *
 * @param locale Локаль перевода из базы данных.
 * @returns `true`, если локаль допустима для редактора.
 */
const isBlogEditorLocale = (locale: string): locale is BlogEditorLocale => {
  return locale === 'ru' || locale === 'en' || locale === 'sr';
};

/**
 * Сужает перевод Prisma до структуры, поддерживаемой редактором.
 *
 * @param translation Перевод статьи из базы данных.
 * @returns `true`, если локаль перевода поддерживается редактором.
 */
const isEditorTranslationRecord = (
  translation: BlogEditorPostRecord['translations'][number]
): translation is BlogEditorPostRecord['translations'][number] & { locale: BlogEditorLocale } => {
  return isBlogEditorLocale(translation.locale);
};

/**
 * Преобразует данные Prisma в форму инициализации редактора.
 *
 * @param post Статья из базы данных.
 * @param categories Список доступных категорий.
 * @param authors Список доступных авторов.
 * @returns Начальные данные редактора статьи.
 */
const createInitialData = (
  post: BlogEditorPostRecord,
  categories: BlogEditorCategory[],
  authors: BlogEditorAuthorRecord[]
): BlogEditorInitialData => {
  return {
    postId: post.id,
    slug: post.slug,
    status: post.status,
    coverImage: post.coverImage,
    translations: post.translations.filter(isEditorTranslationRecord).map(translation => ({
      locale: translation.locale,
      title: translation.title,
      description: translation.description,
      content: translation.content
    })),
    categoryIds: post.categories.map(categoryRelation => categoryRelation.categoryId),
    authorId: post.authorId,
    categories,
    authors
  };
};

export default async function AdminBlogEditPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    notFound();
  }

  const [post, categories, authors] = await Promise.all([
    prisma.blogPost.findUnique({
      where: { id },
      include: {
        translations: true,
        categories: { include: { category: true } }
      }
    }),
    prisma.blogCategory.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }]
    })
  ]);

  if (!post) {
    notFound();
  }

  const normalizedCategories: BlogEditorCategory[] = categories.map(
    (category: (typeof categories)[number]) => ({
      ...category,
      name: normalizeCategoryName(category.name)
    })
  );

  return (
    <div className="h-[calc(100vh-6.5rem)] min-h-[500px] flex flex-col">
      <BlogEditorForm initialData={createInitialData(post, normalizedCategories, authors)} />
    </div>
  );
}
