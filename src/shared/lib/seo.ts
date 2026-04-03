import type { Metadata } from 'next';
import { defaultLocale, type AppLocale, locales } from '@/i18n/config';

export const SITE_URL = 'https://vershkov.com';
export const SITE_ORIGIN = new URL(SITE_URL);
export const SITE_NAME = 'Vershkov.com';

const DEFAULT_OG_IMAGE_PATH = '/apple-icon.png';

interface SeoLocaleCopy {
  siteTitle: string;
  siteDescription: string;
  homeTitle: string;
  homeDescription: string;
  blogTitle: string;
  blogDescription: string;
}

const SEO_COPY: Record<AppLocale, SeoLocaleCopy> = {
  en: {
    siteTitle: 'Vershkov.com',
    siteDescription:
      'Psychological counseling, ADHD support, and evidence-based mental health resources.',
    homeTitle: 'Psychologist and ADHD support',
    homeDescription:
      'Online psychological counseling, practical ADHD support, and a clear therapy journey for adults and families.',
    blogTitle: 'Mental health blog',
    blogDescription:
      'Articles about psychology, ADHD, self-regulation, and mental health in Russian, English, and Serbian.'
  },
  ru: {
    siteTitle: 'Vershkov.com',
    siteDescription:
      'Психологическое консультирование, поддержка при СДВГ и практичные материалы о ментальном здоровье.',
    homeTitle: 'Психолог и поддержка при СДВГ',
    homeDescription:
      'Онлайн-консультации психолога, поддержка при СДВГ и понятный путь терапии для взрослых и семей.',
    blogTitle: 'Блог о ментальном здоровье',
    blogDescription:
      'Статьи о психологии, СДВГ, саморегуляции и mental health на русском, английском и сербском.'
  },
  sr: {
    siteTitle: 'Vershkov.com',
    siteDescription:
      'Psihološko savetovanje, podrška kod ADHD-a i praktični resursi za mentalno zdravlje.',
    homeTitle: 'Psiholog i podrška kod ADHD-a',
    homeDescription:
      'Online psihološko savetovanje, podrška kod ADHD-a i jasan terapijski put za odrasle i porodice.',
    blogTitle: 'Blog o mentalnom zdravlju',
    blogDescription:
      'Članci o psihologiji, ADHD-u, samoregulaciji i mentalnom zdravlju na ruskom, engleskom i srpskom.'
  }
};

/**
 * Нормализует pathname для последующей сборки локализованных URL.
 * @param pathname - относительный путь приложения.
 * @returns Путь без завершающего `/`, кроме корня.
 */
const normalizePathname = (pathname: string): string => {
  if (pathname === '/') {
    return '/';
  }

  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;

  return withLeadingSlash.replace(/\/+$/, '');
};

/**
 * Возвращает SEO-копирайтинг для нужной локали.
 * @param locale - активная локаль.
 * @returns Набор локализованных SEO-строк.
 */
export const getSeoCopy = (locale: AppLocale): SeoLocaleCopy => {
  return SEO_COPY[locale] ?? SEO_COPY[defaultLocale];
};

/**
 * Собирает локализованный pathname в формате `/{locale}/...`.
 * @param locale - активная локаль.
 * @param pathname - внутренний путь приложения без префикса локали.
 * @returns Локализованный pathname.
 */
export const getLocalizedPathname = (locale: AppLocale, pathname = '/'): string => {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === '/') {
    return `/${locale}`;
  }

  return `/${locale}${normalizedPathname}`;
};

/**
 * Собирает абсолютный URL для локализованного маршрута.
 * @param locale - активная локаль.
 * @param pathname - внутренний путь приложения без префикса локали.
 * @returns Абсолютный URL страницы.
 */
export const getLocalizedUrl = (locale: AppLocale, pathname = '/'): string => {
  return new URL(getLocalizedPathname(locale, pathname), SITE_ORIGIN).toString();
};

/**
 * Создает карту hreflang-альтернатив для metadata и sitemap.
 * @param pathname - внутренний путь приложения без префикса локали.
 * @param availableLocales - локали, для которых нужно сгенерировать alternate URLs.
 * @returns Объект `hreflang -> absolute URL`.
 */
export const getLanguageAlternates = (
  pathname: string,
  availableLocales: readonly AppLocale[] = locales
): Record<string, string> => {
  return Object.fromEntries(
    availableLocales.map(locale => [locale, getLocalizedUrl(locale, pathname)])
  );
};

/**
 * Создает canonical и hreflang для страницы.
 * @param locale - текущая локаль страницы.
 * @param pathname - внутренний путь приложения без префикса локали.
 * @param availableLocales - доступные локали страницы.
 * @returns Поле `alternates` для Next.js metadata.
 */
export const createCanonicalAlternates = (
  locale: AppLocale,
  pathname: string,
  availableLocales: readonly AppLocale[] = locales
): Metadata['alternates'] => {
  return {
    canonical: getLocalizedPathname(locale, pathname),
    languages: getLanguageAlternates(pathname, availableLocales)
  };
};

/**
 * Возвращает абсолютный URL изображения для Open Graph/Twitter metadata.
 * @param imagePath - относительный или абсолютный путь до изображения.
 * @returns Абсолютный URL изображения.
 */
export const resolveMetadataImage = (imagePath?: string | null): string => {
  return new URL(imagePath ?? DEFAULT_OG_IMAGE_PATH, SITE_ORIGIN).toString();
};

/**
 * Создает базовые metadata для публичной части сайта.
 * @param locale - активная локаль.
 * @returns Базовые metadata уровня layout.
 */
export const createBaseMetadata = (locale: AppLocale): Metadata => {
  const copy = getSeoCopy(locale);
  const image = resolveMetadataImage();

  return {
    metadataBase: SITE_ORIGIN,
    applicationName: SITE_NAME,
    title: {
      default: copy.siteTitle,
      template: `%s | ${SITE_NAME}`
    },
    description: copy.siteDescription,
    formatDetection: {
      address: false,
      email: false,
      telephone: false
    },
    openGraph: {
      type: 'website',
      locale,
      siteName: SITE_NAME,
      images: [
        {
          url: image,
          alt: SITE_NAME
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      images: [image]
    },
    appleWebApp: {
      title: 'Vershkov',
      statusBarStyle: 'default',
      capable: true
    }
  };
};
