import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Mail, Send, MessageCircle, ArrowUpRight } from 'lucide-react';
import styles from './footer.module.css';

/**
 * Минималистичный и профессиональный Footer.
 * Включает навигацию, ссылки на профессиональные ассоциации, контакты и юридическую информацию.
 * @returns Секция подвала.
 */
export const Footer = () => {
  const tFooter = useTranslations('Home.footer');
  const tNav = useTranslations('Home.nav');
  const currentYear = new Date().getFullYear();

  const navLinks = [
    { href: '#about', label: tNav('about') },
    { href: '#services', label: tNav('services') },
    { href: '#faq', label: tNav('faq') },
    { href: '#contact', label: tNav('contact') },
    { href: '/blog', label: tNav('blog') }
  ];

  const associations = [
    {
      href: 'https://akpn.org',
      label: tFooter('associationAkpn')
    },
    {
      href: 'https://www.schematherapysociety.org',
      label: tFooter('associationIsst')
    }
  ];

  const contacts = [
    { href: 'https://t.me/looking_dopamine', label: tFooter('telegramLabel'), icon: Send },
    { href: 'https://wa.me/79370843451', label: tFooter('whatsappLabel'), icon: MessageCircle },
    { href: 'mailto:anna@vershkov.com', label: 'anna@vershkov.com', icon: Mail }
  ];

  return (
    <footer className={styles.footer} id="footer">
      <div className={styles.footer__container}>
        <div className={styles.footer__grid}>
          {/* Колонка 1: Лого/Описание */}
          <div className={styles.footer__col}>
            <Link href="/" className={styles.footer__logo}>
              <span>
                Анна Вершкова<span className={styles.footer__logo_dot}>.</span>
              </span>
            </Link>
            <p className={styles.footer__description}>
              Психолог, схема-терапевт, специалист по работе с СДВГ, РАС и нарушениями пищевого
              поведения.
            </p>
          </div>

          {/* Колонка 2: Навигация */}
          <div className={styles.footer__col}>
            <h3 className={styles.footer__col_title}>{tFooter('navTitle')}</h3>
            <ul className={styles.footer__list}>
              {navLinks.map(link => (
                <li key={link.href}>
                  {link.href.startsWith('#') ? (
                    <a href={link.href} className={styles.footer__link}>
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className={styles.footer__link}>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Колонка 3: Сообщества */}
          <div className={styles.footer__col}>
            <h3 className={styles.footer__col_title}>{tFooter('associationsTitle')}</h3>
            <ul className={styles.footer__list}>
              {associations.map(assoc => (
                <li key={assoc.href}>
                  <a
                    href={assoc.href}
                    className={`${styles.footer__link} ${styles.footer__link_assoc}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className={styles.footer__assoc_text}>{assoc.label}</span>
                    <ArrowUpRight size={14} className={styles.footer__assoc_icon} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Колонка 4: Контакты */}
          <div className={styles.footer__col}>
            <h3 className={styles.footer__col_title}>{tFooter('contactsTitle')}</h3>
            <ul className={styles.footer__list}>
              {contacts.map(contact => (
                <li key={contact.href}>
                  <a
                    href={contact.href}
                    className={`${styles.footer__link} ${styles.footer__link_contact}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <contact.icon size={16} className={styles.footer__contact_icon} />
                    <span>{contact.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.footer__bottom}>
          <div className={styles.footer__copy}>{tFooter('copyright', { year: currentYear })}</div>
          <div className={styles.footer__legal}>
            <Link href="/privacy" className={styles.footer__legal_link}>
              {tFooter('privacyLabel')}
            </Link>
            <Link href="/consent" className={styles.footer__legal_link}>
              {tFooter('consentLabel')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
