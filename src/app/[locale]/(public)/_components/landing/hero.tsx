'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import styles from './hero.module.css';
import psychoPhoto from '@/assets/images/adhd/Ann.jpeg';

/**
 * Hero — первый экран лендинга.
 * Форма фотографии: суперэллипс (squircle) через CSS clip-path path().
 * Цитата-блок переработана в визуально выделенную карточку.
 * @returns Первый экран лендинга.
 */
const Hero = () => {
  const t = useTranslations('Home.hero');
  const tCommon = useTranslations('Home');

  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      {/* Декоративные фоновые пятна */}
      <div className={styles.hero__glow_left} aria-hidden="true" />
      <div className={styles.hero__glow_right} aria-hidden="true" />

      <div className={styles.hero__container}>
        {/* Левая колонка: Текстовый контент */}
        <div className={styles.hero__content}>
          <div className={styles.hero__badge}>{tCommon('badge')}</div>

          <h1 id="hero-heading" className={styles.hero__title}>
            <span className={styles.hero__title_accent}>{t('titleAccent')}</span> {t('titleRest')}
          </h1>

          <p className={styles.hero__subtitle}>
            {t('subtitleLine1')} {t('subtitleLine2')}
          </p>

          {/* Переработанный блок цитаты */}
          <div className={styles.hero__quote_box}>
            <div className={styles.hero__quote_inner}>
              <p className={styles.hero__quote_label}>{t('highlight')}</p>
              <blockquote className={styles.hero__quote}>
                {t('questionLine1')} {t('questionLine2')}
              </blockquote>
            </div>
          </div>

          <div className={styles.hero__actions}>
            <a href="#contact" className={styles.hero__btn_primary}>
              Записаться на сессию
            </a>
            <a href="#about" className={styles.hero__btn_secondary}>
              Подробнее обо&nbsp;мне
            </a>
          </div>
        </div>

        {/* Правая колонка: Фотография в форме суперэллипса */}
        <div className={styles.hero__image_wrap}>
          {/* Декоративные орбиты */}
          <div className={styles.hero__orbit_outer} aria-hidden="true" />
          <div className={styles.hero__orbit_inner} aria-hidden="true" />

          {/* Декоративное свечение позади */}
          <div className={styles.hero__image_glow} aria-hidden="true" />

          {/* Фото в суперэллипсе */}
          <div className={styles.hero__image_container}>
            <Image
              src={psychoPhoto}
              alt={tCommon('photoAlt')}
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 768px) 90vw, 45vw"
              className={styles.hero__image}
              placeholder="blur"
            />
          </div>

          {/* Карточка имени */}
          <div className={styles.hero__image_card}>
            <span className={styles.hero__card_name}>{tCommon('name')}</span>
            <span className={styles.hero__card_title}>{tCommon('subtitle')}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Hero };
