import Image from 'next/image';
import { useTranslations } from 'next-intl';
import styles from './footer.module.css';

import psychoPhoto from '@/assets/images/adhd/Ann.jpeg';
import { Link } from '@/i18n/navigation';

/**
 * Футер лендинга: CTA-блок в стиле конверта, контакты, копирайт.
 * Сам загружает тексты футера, чтобы не получать большой объект через props.
 * @returns Нижняя секция лендинга.
 */
export const Footer = () => {
  const tHome = useTranslations('Home');
  const tFooter = useTranslations('Home.footer');
  const currentYear = new Date().getFullYear();
  const socialLinks = [
    {
      href: 'https://t.me/looking_dopamine',
      label: tFooter('telegramLabel'),
      variant: 'pink' as const
    },
    {
      href: 'https://wa.me/79370843451',
      label: tFooter('whatsappLabel'),
      variant: 'pink' as const
    },
    {
      href: 'https://www.instagram.com/ania_vverh/',
      label: tFooter('instagramLabel'),
      variant: 'blue' as const
    }
  ];

  return (
    <footer className={styles.footer} id="footer">
      {/* ── Конверт — дальний фон ────────────────────────────── */}
      {/*<div*/}
      {/*  className={styles.footer__envelop}*/}
      {/*  style={{ backgroundImage: `url(${envelopImg.src})` }}*/}
      {/*  aria-hidden="true"*/}
      {/*/>*/}

      {/*/!* ── Треугольники по бокам (передний план) ───────────── *!/*/}
      {/*<div*/}
      {/*  className={styles.footer__triLeft}*/}
      {/*  style={{ backgroundImage: `url(${envelopLeft.src})` }}*/}
      {/*  aria-hidden="true"*/}
      {/*/>*/}
      {/*<div*/}
      {/*  className={styles.footer__triRight}*/}
      {/*  style={{ backgroundImage: `url(${envelopRight.src})` }}*/}
      {/*  aria-hidden="true"*/}
      {/*/>*/}

      {/* ── Белая карточка-письмо ────────────────────────────── */}
      <div className={styles.footer__card}>
        {/* Поляроид с фото */}
        <div className={styles.footer__polaroid} aria-hidden="true">
          <div className={styles.footer__polaroidInner}>
            <Image
              src={psychoPhoto}
              alt={tHome('photoAlt')}
              className={styles.footer__photo}
              placeholder="blur"
            />
          </div>
        </div>

        {/* Контентная область */}
        <div className={styles.footer__cardContent}>
          <h2 className={styles.footer__title}>
            {tFooter('titleLine1')} <br />
            <span className={styles.footer__accent}>{tFooter('titleAccent')}</span>
          </h2>
          <p className={styles.footer__sub}>
            {tFooter('descriptionStart')}
            <br />
            <Link href="/blog" className={styles.footer__link}>
              {tFooter('blogLabel')}
            </Link>
            &nbsp;{tFooter('descriptionEnd')}
          </p>

          {/* ── Кнопки соцсетей (паттерн oval из HeroNav) ───── */}
          <div className={styles.footer__socials}>
            {socialLinks.map(({ href, label, variant }) => (
              <a
                key={label}
                href={href}
                className={styles.footer__socialBtn}
                data-variant={variant}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span
                  className={styles.footer__socialOval}
                  data-variant={variant}
                  aria-hidden="true"
                />
                {label}
              </a>
            ))}
          </div>

          {/* ── Юридические ссылки ───────────────────────────── */}
          <div className={styles.footer__legal}>
            <Link href="/privacy" className={styles.footer__legalLink}>
              {tFooter('privacyLabel')}
            </Link>
            <Link href="/consent" className={styles.footer__legalLink}>
              {tFooter('consentLabel')}
            </Link>
          </div>
        </div>
        {/* ── Нижняя строка ────────────────────────────────────── */}
        <div className={styles.footer__bottom}>
          <p className={styles.footer__copy}>{tFooter('copyright', { year: currentYear })}</p>
          <p className={styles.footer__credit}>{tFooter('credit')}</p>
        </div>
      </div>
    </footer>
  );
};
