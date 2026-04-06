'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import styles from './HeroNav.module.css';

interface NavLink {
  kind: 'anchor' | 'route';
  href: string;
  label: string;
}

interface HeroNavBurgerProps {
  links: NavLink[];
  ctaLabel: string;
  openMenuLabel: string;
  closeMenuLabel: string;
}

/**
 * Бургер-кнопка и мобильное меню для Hero-навигации.
 * Сохраняет locale-aware маршруты для публичных ссылок сайта.
 * @param props - список ссылок и локализованные подписи элементов управления.
 * @returns Кнопка открытия и мобильное меню.
 */
const HeroNavBurger = ({ links, ctaLabel, openMenuLabel, closeMenuLabel }: HeroNavBurgerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);

  return (
    <>
      <button
        type="button"
        className={styles.burger}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? closeMenuLabel : openMenuLabel}
        aria-expanded={isOpen}
      >
        {/* Инлайн SVG из /assets/images/adhd/menu.svg */}
        <svg
          width="27"
          height="14"
          viewBox="0 0 27 14"
          fill="none"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 3.60567C1.1545 2.98454 3 1.60567 4.21385 1.3012C7.95185 0.363607 9.40128 1.801 12.717 3.06472C15.0302 3.94637 18.7254 3.09514 20.0028 2.65271C21.5218 2.12657 23.717 0.467112 25.3394 1.27233"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M1 8.21135C1.1545 7.59022 3 6.21135 4.21385 5.90688C7.95185 4.96929 9.40128 6.40668 12.717 7.6704C15.0302 8.55205 18.7254 7.70083 20.0028 7.25839C21.5218 6.73225 23.717 5.07279 25.3394 5.87801"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M1 12.817C1.1545 12.1959 3 10.817 4.21385 10.5125C7.95185 9.57496 9.40128 11.0123 12.717 12.2761C15.0302 13.1577 18.7254 12.3065 20.0028 11.8641C21.5218 11.3379 23.717 9.67846 25.3394 10.4837"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.nav__overlay} role="dialog" aria-modal="true">
          <button
            type="button"
            className={styles.nav__close}
            onClick={close}
            aria-label={closeMenuLabel}
          >
            ✕
          </button>

          <ul className={styles.nav__mobile_list}>
            {links.map(({ kind, href, label }) => (
              <li key={href}>
                {kind === 'route' ? (
                  <Link href={href} className={styles.nav__mobile_link} onClick={close}>
                    {label}
                  </Link>
                ) : (
                  <a href={href} className={styles.nav__mobile_link} onClick={close}>
                    {label}
                  </a>
                )}
              </li>
            ))}
            <li>
              <div className={styles.nav__btn_wrap}>
                <span className={styles.hero__oval} aria-hidden="true" />
                <a href="#footer" className={styles.nav__btn} onClick={close}>
                  {ctaLabel}
                </a>
              </div>
            </li>
          </ul>
        </div>
      )}
    </>
  );
};

export default HeroNavBurger;
