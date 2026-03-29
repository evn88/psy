import styles from './HeroNav.module.css';

/** Навигация Hero-секции лендинга */
const HeroNav = () => {
  const links = [
    { href: '#about', label: 'Обо мне' },
    { href: '#services', label: 'как я могу помочь?' },
    { href: '#problems', label: 'Работа с нейроотличиями' },
    { href: '#faq', label: 'Частые вопросы' },
    { href: '#footer', label: 'контакты' },
    { href: '/blog', label: 'Статьи и тесты' }
  ];

  return (
    <nav className={styles.nav}>
      <ul className={styles.nav__list}>
        {links.map(({ href, label }) => (
          <li key={href}>
            <a href={href} className={styles.nav__link}>
              {label}
            </a>
          </li>
        ))}
      </ul>
      <div className={styles.nav__btn_wrap}>
        <span className={styles.hero__oval} aria-hidden="true" />
        <a href="#footer" className={styles.nav__btn}>
          Записаться
        </a>
      </div>
    </nav>
  );
};

export default HeroNav;
