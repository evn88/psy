import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import prisma from '@/shared/lib/prisma';
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

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ category?: string; lang?: string }>;
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

async function BlogContent({
  categorySlug,
  locale
}: {
  categorySlug: string | null;
  locale: string;
}) {
  const [posts, categories] = (await Promise.all([
    getCachedPosts(categorySlug),
    getCachedCategories()
  ])) as [BlogPostRecord[], BlogCategoryRecord[]];

  const localeOrder = [locale, 'ru', 'en', 'sr'];

  const getTranslation = (translations: BlogTranslation[]) => {
    for (const loc of localeOrder) {
      const t = translations.find(t => t.locale === loc && t.title);
      if (t) return t;
    }
    return translations[0] ?? { title: 'Без заголовка', description: '' };
  };

  return (
    <>
      {/* Фильтры категорий */}
      {categories.length > 0 && (
        <Suspense>
          <CategoryFilter
            categories={categories.map(category => ({
              slug: category.slug,
              name: category.name
            }))}
            activeSlug={categorySlug}
            locale={locale}
          />
        </Suspense>
      )}

      {/* Сетка статей */}
      {posts.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">Статей пока нет</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => {
            const t = getTranslation(post.translations);
            const cats = post.categories.map(categoryRelation => ({
              slug: categoryRelation.category.slug,
              name: categoryRelation.category.name
            }));
            return (
              <BlogCard
                key={post.id}
                slug={post.slug}
                title={t.title}
                description={t.description}
                coverImage={post.coverImage}
                readingTime={post.readingTime}
                publishedAt={post.publishedAt}
                author={post.author}
                categories={cats}
                locale={locale}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

export default async function BlogPage({ searchParams }: Props) {
  const { category, lang } = await searchParams;
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value ?? 'ru';
  // ?lang= из URL переопределяет куки-локаль
  const locale = lang ?? cookieLocale;
  const t = await getTranslations({ locale, namespace: 'Blog' });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{t('title')}</h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Психология, саморазвитие и mental health
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <Suspense fallback={<div className="h-10 animate-pulse bg-muted rounded-full w-48" />}>
          <BlogContent categorySlug={category ?? null} locale={locale} />
        </Suspense>

        {/* Подписка — минималистичный footer-блок */}
        <div className="pt-8 border-t border-border">
          <div className="max-w-sm">
            <p className="text-sm text-muted-foreground mb-3">
              Подпишитесь, чтобы получать новые статьи на email
            </p>
            <SubscribeForm />
          </div>
        </div>
      </div>
    </div>
  );
}
