import type { MetadataRoute } from 'next';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';
import prisma from '@/shared/lib/prisma';
import { getLanguageAlternates, getLocalizedUrl } from '@/shared/lib/seo';

const STATIC_PUBLIC_ROUTES = [
  { pathname: '/', changeFrequency: 'weekly' as const, priority: 1 },
  { pathname: '/blog', changeFrequency: 'weekly' as const, priority: 0.8 }
];

interface SitemapTranslationRecord {
  locale: string;
  title: string | null;
}

interface SitemapPostRecord {
  slug: string;
  publishedAt: Date | null;
  updatedAt: Date;
  translations: SitemapTranslationRecord[];
}

/**
 * Выбирает каноническую локаль для sitemap entry.
 * @param availableLocales - локали, для которых существует контент.
 * @returns Локаль, которая будет использована в поле `url`.
 */
const getCanonicalLocale = (availableLocales: readonly AppLocale[]): AppLocale => {
  if (availableLocales.includes(defaultLocale)) {
    return defaultLocale;
  }

  return availableLocales[0] ?? defaultLocale;
};

/**
 * Генерирует локализованный sitemap.xml.
 * В карту попадают только публичные страницы и опубликованные статьи блога.
 * @returns Список записей sitemap с hreflang-альтернативами.
 */
const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const blogPosts = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      slug: true,
      publishedAt: true,
      updatedAt: true,
      translations: {
        select: {
          locale: true,
          title: true
        }
      }
    },
    orderBy: { publishedAt: 'desc' }
  });

  const staticEntries: MetadataRoute.Sitemap = STATIC_PUBLIC_ROUTES.map(route => ({
    url: getLocalizedUrl(defaultLocale, route.pathname),
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: {
      languages: getLanguageAlternates(route.pathname)
    }
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPosts.flatMap((post: SitemapPostRecord) => {
    const availableLocales = post.translations.reduce<AppLocale[]>((acc, translation) => {
      if (translation.title && isLocale(translation.locale) && !acc.includes(translation.locale)) {
        acc.push(translation.locale);
      }

      return acc;
    }, []);

    if (availableLocales.length === 0) {
      return [];
    }

    const pathname = `/blog/${post.slug}`;
    const canonicalLocale = getCanonicalLocale(availableLocales);

    return [
      {
        url: getLocalizedUrl(canonicalLocale, pathname),
        lastModified: post.updatedAt ?? post.publishedAt ?? new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: {
          languages: getLanguageAlternates(pathname, availableLocales)
        }
      }
    ];
  });

  return [...staticEntries, ...blogEntries];
};

export default sitemap;
