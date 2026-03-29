import { Suspense } from 'react';
import { cookies } from 'next/headers';
import prisma from '@/shared/lib/prisma';
import { BlogCard } from './_components/blog-card';
import { CategoryFilter } from './_components/category-filter';
import { SubscribeForm } from './_components/subscribe-form';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ category?: string }>;
}

async function BlogContent({
  categorySlug,
  locale
}: {
  categorySlug: string | null;
  locale: string;
}) {
  const [posts, categories] = await Promise.all([
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
    prisma.blogCategory.findMany({ orderBy: { createdAt: 'asc' } })
  ]);

  const localeOrder = [locale, 'ru', 'en', 'sr'];

  const getTranslation = (
    translations: { locale: string; title: string; description: string }[]
  ) => {
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
            categories={categories.map((c: { slug: string; name: unknown }) => ({
              slug: c.slug,
              name: c.name as Record<string, string>
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
          {posts.map((post: any) => {
            const t = getTranslation(post.translations);
            const cats = post.categories.map((c: any) => ({
              slug: c.category.slug,
              name: c.category.name as Record<string, string>
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
  const { category } = await searchParams;
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value ?? 'ru';

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Hero */}
      <div className="bg-[#03070A] text-white pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Блог</h1>
          <p className="text-white/60 text-lg">Статьи о психологии, саморазвитии и mental health</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <Suspense fallback={<div className="h-10 animate-pulse bg-muted rounded-full w-48" />}>
          <BlogContent categorySlug={category ?? null} locale={locale} />
        </Suspense>

        {/* Блок подписки */}
        <div className="bg-card rounded-2xl border border-border p-8 text-center max-w-xl mx-auto">
          <h2 className="text-xl font-bold text-foreground mb-2">Подпишитесь на новые статьи</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Получайте уведомления о публикациях прямо на email
          </p>
          <SubscribeForm />
        </div>
      </div>
    </div>
  );
}
