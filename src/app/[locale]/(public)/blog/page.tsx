import type { Metadata } from 'next';
import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { locales, type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import prisma from '@/lib/prisma';
import {
  createCanonicalAlternates,
  createOpenGraphMetadata,
  getLocalizedUrl,
  getSeoCopy
} from '@/lib/seo';
import { BlogCard } from './_components/blog-card';
import { CategoryFilter } from './_components/category-filter';
import { SubscribeForm } from './_components/subscribe-form';

const getCachedPosts = unstable_cache(
  async (categorySlug: string | null) =>
    prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
        ...(categorySlug ? { categories: { some: { category: { slug: categorySlug } } } } : {})
      },
      orderBy: { publishedAt: 'desc' },
      include: {
        translations: { select: { locale: true, title: true, description: true } },
        categories: { include: { category: { select: { slug: true, name: true } } } },
        author: { select: { name: true } }
      }
    }),
  ['blog-posts'],
  { revalidate: 60, tags: ['blog-posts'] }
);

const getCachedCategories = unstable_cache(
  async () => prisma.blogCategory.findMany({ orderBy: { createdAt: 'asc' } }),
  ['blog-categories'],
  { revalidate: 60, tags: ['blog-categories'] }
);

const BLOG_SUBTITLE: Record<AppLocale, string> = {
  en: 'Psychology, self-regulation, and mental health practice',
  ru: 'Психология, саморегуляция и практика mental health',
  sr: 'Psihologija, samoregulacija i praksa mentalnog zdravlja'
};

export const dynamic = 'force-dynamic';

interface BlogPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}

interface BlogTranslation {
  locale: string;
  title: string;
  description: string;
}

interface BlogCategoryRecord {
  slug: string;
  name: Record<string, string>;
}

interface BlogPostRecord {
  id: string;
  slug: string;
  coverImage: string | null;
  readingTime: number;
  publishedAt: Date | null;
  author: { name: string | null } | null;
  translations: BlogTranslation[];
  categories: { category: BlogCategoryRecord }[];
}

interface BlogContentProps {
  categorySlug: string | null;
  locale: AppLocale;
  allCategoriesLabel: string;
  emptyStateLabel: string;
  getReadingTimeLabel: (readingTime: number) => string;
}

/**
 * Возвращает metadata для страницы списка статей.
 * @param props - locale сегмента блога.
 * @returns Metadata локализованного блога.
 */
export const generateMetadata = async ({
  params
}: Pick<BlogPageProps, 'params'>): Promise<Metadata> => {
  const { locale } = await params;
  const currentLocale = isLocale(locale) ? locale : defaultLocale;
  const copy = getSeoCopy(currentLocale);

  return {
    title: copy.blogTitle,
    description: copy.blogDescription,
    alternates: createCanonicalAlternates(currentLocale, '/blog'),
    openGraph: createOpenGraphMetadata({
      type: 'website',
      locale: currentLocale,
      title: copy.blogTitle,
      description: copy.blogDescription,
      url: getLocalizedUrl(currentLocale, '/blog')
    }),
    twitter: {
      title: copy.blogTitle,
      description: copy.blogDescription
    }
  };
};

/**
 * Рендерит список публикаций и фильтр категорий для текущей локали.
 * @param props - параметры фильтра и локали.
 * @returns Контент страницы блога.
 */
const BlogContent = async ({
  categorySlug,
  locale,
  allCategoriesLabel,
  emptyStateLabel,
  getReadingTimeLabel
}: BlogContentProps) => {
  const [posts, categories] = (await Promise.all([
    getCachedPosts(categorySlug),
    getCachedCategories()
  ])) as [BlogPostRecord[], BlogCategoryRecord[]];

  /**
   * Создает порядок локалей для поиска перевода.
   * Текущая локаль первой, затем остальные в порядке конфига.
   */
  const getLocaleOrder = (currentLocale: AppLocale): AppLocale[] => {
    const otherLocales = locales.filter(l => l !== currentLocale);
    return [currentLocale, ...otherLocales];
  };

  const localeOrder = getLocaleOrder(locale);

  const getTranslation = (translations: BlogTranslation[]) => {
    for (const localeCode of localeOrder) {
      const translation = translations.find(item => item.locale === localeCode && item.title);
      if (translation) {
        return translation;
      }
    }

    return translations[0] ?? { title: 'Без заголовка', description: '' };
  };

  return (
    <>
      {categories.length > 0 && (
        <Suspense>
          <CategoryFilter
            allLabel={allCategoriesLabel}
            categories={categories.map(category => ({
              slug: category.slug,
              name: category.name
            }))}
            activeSlug={categorySlug}
            locale={locale}
          />
        </Suspense>
      )}

      {posts.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center">{emptyStateLabel}</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => {
            const translation = getTranslation(post.translations);
            const categoriesList = post.categories.map(categoryRelation => ({
              slug: categoryRelation.category.slug,
              name: categoryRelation.category.name
            }));

            return (
              <BlogCard
                key={post.id}
                slug={post.slug}
                title={translation.title}
                description={translation.description}
                coverImage={post.coverImage}
                readingTimeLabel={getReadingTimeLabel(post.readingTime)}
                publishedAt={post.publishedAt}
                author={post.author}
                categories={categoriesList}
                locale={locale}
              />
            );
          })}
        </div>
      )}
    </>
  );
};

/**
 * Страница списка публикаций блога.
 * Использует locale из сегмента маршрута вместо query-параметров.
 * @param props - locale сегмента и query-фильтры.
 * @returns Локализованная страница блога.
 */
const BlogPage = async ({ params, searchParams }: BlogPageProps) => {
  const [{ locale }, { category }] = await Promise.all([params, searchParams]);
  const currentLocale = isLocale(locale) ? locale : defaultLocale;
  const t = await getTranslations({ locale: currentLocale, namespace: 'Blog' });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <h1 className="mb-2 text-3xl font-bold text-foreground sm:text-4xl">{t('title')}</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            {BLOG_SUBTITLE[currentLocale]}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <Suspense fallback={<div className="h-10 w-48 animate-pulse rounded-full bg-muted" />}>
          <BlogContent
            categorySlug={category ?? null}
            locale={currentLocale}
            allCategoriesLabel={t('allCategories')}
            emptyStateLabel={t('noArticles')}
            getReadingTimeLabel={readingTime => t('minRead', { n: readingTime })}
          />
        </Suspense>

        <div className="border-t border-border pt-8">
          <div className="max-w-sm">
            <p className="mb-3 text-sm text-muted-foreground">{t('subscribeDesc')}</p>
            <SubscribeForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
