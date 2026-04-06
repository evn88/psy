import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import DocumentLocaleLink from '@/components/document-locale-link';
import HeroNavBurger from './HeroNavBurger';
import styles from './HeroNav.module.css';

type HeroNavLink =
  | {
      href: string;
      kind: 'anchor';
      label: string;
    }
  | {
      href: string;
      kind: 'route';
      label: string;
      navigation: 'client' | 'document';
    };

/**
 * Навигация Hero-секции лендинга.
 * Сама собирает локализованные подписи и передаёт в клиентское бургер-меню уже готовые данные.
 * @returns Главная навигация первого экрана.
 */
const HeroNav = () => {
  const t = useTranslations('Home.nav');
  const links: HeroNavLink[] = [
    { kind: 'anchor', href: '#about', label: t('about') },
    { kind: 'anchor', href: '#services', label: t('services') },
    { kind: 'anchor', href: '#faq', label: t('faq') },
    { kind: 'anchor', href: '#footer', label: t('contact') },
    { kind: 'route', href: '/blog', label: t('blog'), navigation: 'client' },
    { kind: 'route', href: '/my', label: t('account'), navigation: 'document' }
  ];

  return (
    <nav className={styles.nav}>
      {/* Десктопный список ссылок — скрывается на мобиле через CSS */}
      <ul className={styles.nav__list}>
        {links.map(link => (
          <li key={link.href}>
            {link.kind === 'route' ? (
              link.navigation === 'document' ? (
                <DocumentLocaleLink href={link.href} className={styles.nav__link}>
                  {link.label}
                </DocumentLocaleLink>
              ) : (
                <Link href={link.href} className={styles.nav__link}>
                  {link.label}
                </Link>
              )
            ) : (
              <a href={link.href} className={styles.nav__link}>
                {link.label}
              </a>
            )}
          </li>
        ))}
      </ul>

      {/* Кнопка «Записаться» — скрывается на мобиле через CSS */}
      <div className={styles.nav__btn_wrap}>
        <span className={styles.hero__oval} aria-hidden="true" />
        <a href="#footer" className={styles.nav__btn}>
          {t('cta')}
        </a>
      </div>

      {/* Бургер-кнопка — минимальный клиентский «лист» */}
      <HeroNavBurger
        links={links}
        ctaLabel={t('cta')}
        openMenuLabel={t('openMenu')}
        closeMenuLabel={t('closeMenu')}
      />
    </nav>
  );
};

export default HeroNav;
