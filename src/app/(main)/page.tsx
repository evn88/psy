import '@/styles/landing/landing.css';
import { Hero } from '@/components/landing/Hero/Hero';
import { About } from '@/components/landing/About/About';
import { Problems } from '@/components/landing/Problems/Problems';
import { Services } from '@/components/landing/Services/Services';
import { HowItWorks } from '@/components/landing/HowItWorks/HowItWorks';
import { Testimonials } from '@/components/landing/Testimonials/Testimonials';
import { FAQ } from '@/components/landing/FAQ/FAQ';
import { Footer } from '@/components/landing/Footer/Footer';

/**
 * Лендинг — главная страница.
 * Все компоненты обёрнуты в .landing для изоляции стилей от admin/my.
 */
const HomePage = () => {
  return (
    <div className="landing">
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
