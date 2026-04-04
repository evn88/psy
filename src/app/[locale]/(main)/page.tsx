import type { Metadata } from 'next';
import styles from '@/styles/landing/landing.module.css';
import { About } from '@/components/landing/About/About';
import { Problems } from '@/components/landing/Problems/Problems';
import { Services } from '@/components/landing/Services/Services';
import { HowItWorks } from '@/components/landing/HowItWorks/HowItWorks';
import { Testimonials } from '@/components/landing/Testimonials/Testimonials';
import { FAQ } from '@/components/landing/FAQ/FAQ';
import { Footer } from '@/components/landing/Footer/Footer';
import { defaultLocale, isLocale } from '@/i18n/config';
import {
  createCanonicalAlternates,
  createOpenGraphMetadata,
  getLocalizedUrl,
  getSeoCopy,
  resolveMetadataImage
} from '@/shared/lib/seo';
import { Hero } from '@/components/landing/Hero/Hero';

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
const HomePage = () => {
  return (
    <div className={styles.landingWrapper}>
      {/*<ThemeToggle />*/}
      <Hero />
      <About />
      <Problems />
      <Services />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <Footer />
    </div>
  );
};

export default HomePage;
