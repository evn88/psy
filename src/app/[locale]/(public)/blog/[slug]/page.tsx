import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Calendar, Clock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link, redirect } from '@/i18n/navigation';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import { Badge } from '@/components/ui/badge';
import prisma from '@/lib/prisma';
import {
  createCanonicalAlternates,
  createOpenGraphMetadata,
  getLocalizedUrl,
  resolveMetadataImage
} from '@/lib/seo';
import { extractDescription, formatBlogDate, getBlogLocale } from '@/lib/blog-utils';
import { ArticleContent } from './_components/ArticleContent';

interface BlogArticlePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

interface ArticleCategoryRelation {
  category: {
    slug: string;
    name: unknown;
  };
}

interface ArticleTranslation {
  locale: string;
  title: string | null;
  description: string;
  content: string;
}

const getPublishedPost = cache(async (slug: string) => {
  return prisma.blogPost.findUnique({
    where: { slug, status: 'PUBLISHED' },
    include: {
      translations: true,
      categories: { include: { category: { select: { slug: true, name: true } } } },
      author: { select: { name: true, image: true } }
    }
  });
});

/**
 * Возвращает список локалей, у которых есть полноценный перевод статьи.
 * @param localesList - список локалей переводов из БД.
 * @returns Нормализованный список поддерживаемых локалей.
 */
const getAvailableArticleLocales = (
  localesList: Array<{ locale: string; title: string | null }>
): AppLocale[] => {
  return localesList.reduce<AppLocale[]>((acc, translation) => {
    if (translation.title && isLocale(translation.locale) && !acc.includes(translation.locale)) {
      acc.push(translation.locale);
    }

    return acc;
  }, []);
};

/**
 * Возвращает metadata для локализованной статьи блога.
 * @param props - locale и slug статьи.
 * @returns Metadata статьи с canonical и hreflang.
 */
export const generateMetadata = async ({ params }: BlogArticlePageProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const currentLocale = isLocale(locale) ? locale : defaultLocale;
  const post = await getPublishedPost(slug);

  if (!post) {
    return {};
  }

  const availableLocales = getAvailableArticleLocales(post.translations);
  const resolvedLocale = getBlogLocale(currentLocale, availableLocales);
  const translation =
    post.translations.find((item: ArticleTranslation) => item.locale === resolvedLocale) ??
    post.translations.find((item: ArticleTranslation) => item.locale === defaultLocale) ??
    post.translations[0];

  if (!translation) {
    return {};
  }

  const description = translation.description || extractDescription(translation.content);
  const pathname = `/blog/${slug}`;
  const image = resolveMetadataImage(post.coverImage);

  return {
    title: translation.title,
    description,
    alternates: createCanonicalAlternates(resolvedLocale, pathname, availableLocales),
    openGraph: createOpenGraphMetadata({
      type: 'article',
      locale: resolvedLocale,
      title: translation.title,
      description,
      url: getLocalizedUrl(resolvedLocale, pathname),
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.author?.name ? [post.author.name] : undefined,
      images: [
        {
          url: image,
          alt: translation.title
        }
      ]
    }),
    twitter: {
      title: translation.title,
      description,
      images: [image]
    }
  };
};

/**
 * Страница статьи блога.
 * Если перевода для текущей локали нет, делает redirect на ближайшую доступную локаль.
 * @param props - locale и slug статьи.
 * @returns Локализованная статья.
 */
const BlogArticlePage = async ({ params }: BlogArticlePageProps) => {
  const { locale, slug } = await params;
  const currentLocale = isLocale(locale) ? locale : defaultLocale;
  const post = await getPublishedPost(slug);

  if (!post) {
    notFound();
  }

  const availableLocales = getAvailableArticleLocales(post.translations);
  const resolvedLocale = getBlogLocale(currentLocale, availableLocales);

  if (resolvedLocale !== currentLocale) {
    redirect({
      href: `/blog/${slug}`,
      locale: resolvedLocale
    });
  }

  const translation =
    post.translations.find((item: ArticleTranslation) => item.locale === currentLocale) ??
    post.translations.find((item: ArticleTranslation) => item.locale === defaultLocale) ??
    post.translations[0];

  if (!translation) {
    notFound();
  }

  const t = await getTranslations({ locale: currentLocale, namespace: 'Blog' });
  const categories = post.categories.map((categoryRelation: ArticleCategoryRelation) => ({
    slug: categoryRelation.category.slug,
    name: categoryRelation.category.name as Record<string, string>
  }));

  return (
    <div className="min-h-screen bg-background">
      {post.coverImage && (
        <div className="relative max-h-[420px] aspect-[3/1] w-full overflow-hidden bg-[#03070A]">
          <Image
            src={post.coverImage}
            alt={translation.title}
            fill
            className="object-cover opacity-80"
            priority
            sizes="100vw"
          />
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 pb-12 pt-8">
        {categories.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((category: { slug: string; name: Record<string, string> }) => (
              <Link key={category.slug} href={`/blog?category=${category.slug}`}>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-[#900A0B]/10 hover:text-[#900A0B]"
                >
                  {category.name[currentLocale] ?? category.name.ru ?? category.slug}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        <h1 className="mb-4 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          {translation.title}
        </h1>

        <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-border pb-6 text-sm text-muted-foreground">
          {post.author?.name && (
            <span className="font-medium text-foreground">{post.author.name}</span>
          )}
          {post.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {formatBlogDate(post.publishedAt, currentLocale)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {t('readingTime', { n: post.readingTime })}
          </span>
        </div>

        <ArticleContent content={translation.content} />
      </div>
    </div>
  );
};

export default BlogArticlePage;
