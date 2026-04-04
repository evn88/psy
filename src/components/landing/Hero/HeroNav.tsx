import HeroNavBurger from './HeroNavBurger';
import styles from './HeroNav.module.css';

const NAV_LINKS = [
  { href: '#about', label: 'Обо мне' },
  { href: '#services', label: 'как я могу помочь?' },
  // { href: '#problems', label: 'Работа с нейроотличиями' },
  { href: '#faq', label: 'Частые вопросы' },
  { href: '#footer', label: 'контакты' },
  { href: '/blog', label: 'Статьи и тесты' },
  { href: '/my', label: 'Войти в ЛК' }
];

/** Навигация Hero-секции лендинга */
const HeroNav = () => {
  return (
    <nav className={styles.nav}>
      {/* Десктопный список ссылок — скрывается на мобиле через CSS */}
      <ul className={styles.nav__list}>
        {NAV_LINKS.map(({ href, label }) => (
          <li key={href}>
            <a href={href} className={styles.nav__link}>
              {label}
            </a>
          </li>
        ))}
      </ul>

      {/* Кнопка «Записаться» — скрывается на мобиле через CSS */}
      <div className={styles.nav__btn_wrap}>
        <span className={styles.hero__oval} aria-hidden="true" />
        <a href="#footer" className={styles.nav__btn}>
          Записаться
        </a>
      </div>

      {/* Бургер-кнопка — минимальный клиентский «лист» */}
      <HeroNavBurger links={NAV_LINKS} />
    </nav>
  );
};

export default HeroNav;
