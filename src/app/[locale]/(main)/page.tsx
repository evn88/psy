import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import styles from '@/styles/landing/landing.module.css';
import { DevBanner } from '@/components/landing/DevBanner/DevBanner';
import { Footer } from '@/components/landing/Footer/Footer';
import { Hero } from '@/components/landing/Hero/Hero';
import { defaultLocale, isLocale } from '@/i18n/config';
import { JsonLd } from '@/shared/json-ld';
import {
  createCanonicalAlternates,
  createOpenGraphMetadata,
  createWebsiteStructuredData,
  getLocalizedUrl,
  getSeoCopy,
  resolveMetadataImage
} from '@/shared/lib/seo';

// import { ThemeToggle } from '@/components/landing/ThemeToggle';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Возвращает SEO metadata для локализованного лендинга.
 * @param props - параметры страницы, включая locale.
 * @returns Metadata для главной страницы.
 */
export const generateMetadata = async ({ params }: HomePageProps): Promise<Metadata> => {
  const { locale } = await params;
  const currentLocale = isLocale(locale) ? locale : defaultLocale;
  const copy = getSeoCopy(currentLocale);
  const image = resolveMetadataImage();

  return {
    title: copy.homeTitle,
    description: copy.homeDescription,
    alternates: createCanonicalAlternates(currentLocale, '/'),
    openGraph: createOpenGraphMetadata({
      type: 'website',
      locale: currentLocale,
      title: copy.homeTitle,
      description: copy.homeDescription,
      url: getLocalizedUrl(currentLocale, '/'),
      images: [
        {
          url: image,
          alt: copy.homeTitle
        }
      ]
    }),
    twitter: {
      title: copy.homeTitle,
      description: copy.homeDescription,
      images: [image]
    }
  };
};

/**
 * Лендинг — главная страница.
 * Все компоненты обёрнуты в .landingWrapper (CSS Module) для 100% изоляции от admin/my.
 */
const HomePage = async ({ params }: HomePageProps) => {
  const { locale } = await params;
  const currentLocale = isLocale(locale) ? locale : defaultLocale;
  const tNav = await getTranslations({ locale: currentLocale, namespace: 'Home.nav' });
  const structuredData = createWebsiteStructuredData(currentLocale, [
    { name: tNav('blog'), pathname: '/blog' },
    { name: tNav('account'), pathname: '/account' }
  ]);

  return (
    <div className={styles.landingWrapper}>
      <JsonLd data={structuredData} />
      {/*<ThemeToggle />*/}
      <Hero />
      {/*<About />*/}
      {/*<Problems />*/}
      {/*<Services />*/}
      {/*<HowItWorks />*/}
      {/*<Testimonials />*/}
      {/*<FAQ />*/}
      <DevBanner />
      <Footer />
    </div>
  );
};

export default HomePage;
