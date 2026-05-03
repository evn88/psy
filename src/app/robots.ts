import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/config';
import { SITE_URL } from '@/lib/seo';

/**
 * Генерирует robots.txt через metadata file convention.
 * Закрывает от индексации служебные и приватные разделы приложения.
 * @returns Конфигурация robots.txt.
 */
const robots = (): MetadataRoute.Robots => {
  const localePrivatePaths = locales.flatMap(locale => [`/${locale}/admin/`, `/${locale}/my/`]);

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/my/', '/api/', '/_next/', '/.well-known/', ...localePrivatePaths]
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
};

export default robots;
