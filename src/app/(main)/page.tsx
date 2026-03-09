import styles from '@/styles/landing/landing.module.css';
import { Hero } from '@/components/landing/Hero/Hero';
import { About } from '@/components/landing/About/About';
import { Problems } from '@/components/landing/Problems/Problems';
import { Services } from '@/components/landing/Services/Services';
import { HowItWorks } from '@/components/landing/HowItWorks/HowItWorks';
import { Testimonials } from '@/components/landing/Testimonials/Testimonials';
import { FAQ } from '@/components/landing/FAQ/FAQ';
import { Footer } from '@/components/landing/Footer/Footer';
import { ThemeToggle } from '@/components/landing/ThemeToggle';

/**
 * Лендинг — главная страница.
 * Все компоненты обёрнуты в .landingWrapper (CSS Module) для 100% изоляции от admin/my.
 */
const HomePage = () => {
  return (
    <div className={styles.landingWrapper}>
      <ThemeToggle />
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
