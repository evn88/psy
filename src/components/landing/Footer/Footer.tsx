import Image from 'next/image';
import styles from './Footer.module.css';

import envelopImg from '@/assets/images/adhd/envelop.png';
import envelopLeft from '@/assets/images/adhd/envelop-left.png';
import envelopRight from '@/assets/images/adhd/envelop-right.png';
import psychoPhoto from '@/assets/images/adhd/Ann.jpeg';
import Link from 'next/link';

const SOCIAL_LINKS = [
  { href: 'https://t.me/looking_dopamine', label: 'телеграмм', variant: 'pink' as const },
  { href: 'https://wa.me/79370843451', label: 'вотсап', variant: 'pink' as const },
  { href: 'https://www.instagram.com/ania_vverh/', label: 'инстаграмм', variant: 'blue' as const }
];

/** Футер лендинга: CTA-блок в стиле конверта, контакты, копирайт */
export const Footer = () => {
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
              alt="Психолог Аня"
              className={styles.footer__photo}
              placeholder="blur"
            />
          </div>
        </div>

        {/* Контентная область */}
        <div className={styles.footer__cardContent}>
          <h2 className={styles.footer__title}>
            Если у тебя остались <br />
            вопросы, <span className={styles.footer__accent}>свяжись со мной</span>
          </h2>
          <p className={styles.footer__sub}>
            Любимым удобным для тебя способом, а так же переходи
            <br />
            в&nbsp;
            <Link href={'/blog'} className={styles.footer__link}>
              мой блог
            </Link>
            , там много полезной информации про нейроотличия
          </p>

          {/* ── Кнопки соцсетей (паттерн oval из HeroNav) ───── */}
          <div className={styles.footer__socials}>
            {SOCIAL_LINKS.map(({ href, label, variant }) => (
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
              Политика конфиденциальности
            </Link>
            <Link href="/consent" className={styles.footer__legalLink}>
              Согласие на обработку данных
            </Link>
          </div>
        </div>
        {/* ── Нижняя строка ────────────────────────────────────── */}
        <div className={styles.footer__bottom}>
          <p className={styles.footer__copy}>@ Все права защищены. 2025</p>
          <p className={styles.footer__credit}>Дизайн сайта разработала @akwebd</p>
        </div>
      </div>
    </footer>
  );
};
