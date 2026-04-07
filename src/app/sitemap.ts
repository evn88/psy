import type { MetadataRoute } from 'next';
import { defaultLocale, isLocale, locales, type AppLocale } from '@/i18n/config';
import prisma from '@/shared/lib/prisma';
import { getLanguageAlternates, getLocalizedUrl } from '@/shared/lib/seo';

export const revalidate = 3600;

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
 * Загружает опубликованные статьи для sitemap.
 * При временной недоступности базы возвращает пустой список,
 * чтобы сборка и регенерация sitemap не падали.
 *
 * @returns Опубликованные статьи блога для карты сайта.
 */
const getPublishedBlogPosts = async (): Promise<SitemapPostRecord[]> => {
  try {
    return await prisma.blogPost.findMany({
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
  } catch {
    return [];
  }
};

/**
 * Генерирует sitemap-записи для статических маршрутов.
 * Создает отдельную запись для каждого языка.
 * @returns Список sitemap-записей для статических маршрутов.
 */
const generateStaticEntries = (): MetadataRoute.Sitemap => {
  return STATIC_PUBLIC_ROUTES.flatMap(route =>
    locales.map(locale => ({
      url: getLocalizedUrl(locale, route.pathname),
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: getLanguageAlternates(route.pathname)
      }
    }))
  );
};

/**
 * Генерирует sitemap-записи для статей блога.
 * Создает отдельную запись для каждого доступного языка статьи.
 * @param posts - опубликованные статьи блога с переводами.
 * @returns Список sitemap-записей для статей блога.
 */
const generateBlogEntries = (posts: SitemapPostRecord[]): MetadataRoute.Sitemap => {
  return posts.flatMap((post: SitemapPostRecord) => {
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

    return availableLocales.map(locale => ({
      url: getLocalizedUrl(locale, pathname),
      lastModified: post.updatedAt ?? post.publishedAt ?? new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      alternates: {
        languages: getLanguageAlternates(pathname, availableLocales)
      }
    }));
  });
};

/**
 * Генерирует локализованный sitemap.xml.
 * В карту попадают только публичные страницы и опубликованные статьи блога.
 * Для каждого маршрута создается отдельная запись для каждого языка.
 * @returns Список записей sitemap с hreflang-альтернативами.
 */
const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const blogPosts = await getPublishedBlogPosts();

  const staticEntries = generateStaticEntries();
  const blogEntries = generateBlogEntries(blogPosts);

  return [...staticEntries, ...blogEntries];
};

export default sitemap;
