'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import DocumentLocaleLink from '@/components/document-locale-link';
import styles from './header.module.css';

type HeaderNavLink =
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
 * Адаптивный липкий Header для главной страницы с поддержкой локализации.
 * Использует 'use client' для управления состоянием мобильного меню.
 * @returns Компонент навигации (шапка).
 */
const Header = () => {
  const t = useTranslations('Home.nav');
  const [isOpen, setIsOpen] = useState(false);

  // Блокируем скролл основной страницы, когда открыто мобильное меню
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const links: HeaderNavLink[] = [
    { kind: 'anchor', href: '#about', label: t('about') },
    { kind: 'anchor', href: '#services', label: t('services') },
    { kind: 'anchor', href: '#faq', label: t('faq') },
    { kind: 'anchor', href: '#contact', label: t('contact') },
    { kind: 'route', href: '/blog', label: t('blog'), navigation: 'client' },
    { kind: 'route', href: '/my', label: t('account'), navigation: 'document' }
  ];

  const closeMenu = () => setIsOpen(false);

  return (
    <header className={styles.header}>
      <div className={styles.header__container}>
        {/* Логотип */}
        <Link href="/" className={styles.header__logo} onClick={closeMenu}>
          <span>
            Анна Вершкова<span className={styles.header__logo_dot}>.</span>
          </span>
        </Link>

        {/* Десктопная навигация */}
        <nav className={styles.header__nav} aria-label="Главное меню">
          <ul className={styles.header__nav_list}>
            {links.map(link => (
              <li key={link.href}>
                {link.kind === 'route' ? (
                  link.navigation === 'document' ? (
                    <DocumentLocaleLink href={link.href} className={styles.header__nav_link}>
                      {link.label}
                    </DocumentLocaleLink>
                  ) : (
                    <Link href={link.href} className={styles.header__nav_link}>
                      {link.label}
                    </Link>
                  )
                ) : (
                  <a href={link.href} className={styles.header__nav_link}>
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Кнопка «Записаться» для десктопа */}
        <div className={styles.header__cta_wrap}>
          <a href="#contact" className={styles.header__cta}>
            {t('cta')}
          </a>
        </div>

        {/* Кнопка бургера для мобильных */}
        <button
          type="button"
          className={styles.header__burger}
          onClick={() => setIsOpen(prev => !prev)}
          aria-label={isOpen ? t('closeMenu') : t('openMenu')}
          aria-expanded={isOpen}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {isOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 12h16M4 6h16M4 18h16" />}
          </svg>
        </button>

        {/* Мобильное меню */}
        {isOpen && (
          <div className={styles.header__overlay} role="dialog" aria-modal="true">
            <button
              type="button"
              className={styles.header__close}
              onClick={closeMenu}
              aria-label={t('closeMenu')}
            >
              ✕
            </button>

            <ul className={styles.header__mobile_list}>
              {links.map(link => (
                <li key={link.href}>
                  {link.kind === 'route' ? (
                    link.navigation === 'document' ? (
                      <DocumentLocaleLink
                        href={link.href}
                        className={styles.header__mobile_link}
                        onClick={closeMenu}
                      >
                        {link.label}
                      </DocumentLocaleLink>
                    ) : (
                      <Link
                        href={link.href}
                        className={styles.header__mobile_link}
                        onClick={closeMenu}
                      >
                        {link.label}
                      </Link>
                    )
                  ) : (
                    <a href={link.href} className={styles.header__mobile_link} onClick={closeMenu}>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
              <li>
                <a
                  href="#contact"
                  className={styles.header__cta}
                  onClick={closeMenu}
                  style={{ marginTop: '1rem', width: '200px' }}
                >
                  {t('cta')}
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
