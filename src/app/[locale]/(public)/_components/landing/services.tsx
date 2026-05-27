'use client';

import { useTranslations } from 'next-intl';
import { Clock, Video, Check, Sparkles, Heart, Brain } from 'lucide-react';
import styles from './services.module.css';

type ServiceKey = 'individual' | 'coaching' | 'solanto';

/** Иконка для каждого формата */
const SERVICE_ICONS: Record<ServiceKey, React.ReactNode> = {
  individual: <Heart size={28} strokeWidth={1.5} />,
  coaching: <Brain size={28} strokeWidth={1.5} />,
  solanto: <Sparkles size={28} strokeWidth={1.5} />
};

/** Цвет акцента для каждой карточки */
const SERVICE_ACCENT: Record<ServiceKey, string> = {
  individual: 'var(--color-blue)',
  coaching: 'var(--srv-green)',
  solanto: 'var(--color-blue)'
};

/**
 * Services — блок «Форматы работы и стоимость».
 * Три карточки в сетке, третья выделена как featured.
 * @returns Секция с форматами работы и ценами.
 */
export const Services = () => {
  const t = useTranslations('Home.services');

  const keys: ServiceKey[] = ['individual', 'coaching', 'solanto'];

  return (
    <section className={styles.services} id="services" aria-labelledby="services-heading">
      <div className={styles.services__container}>
        {/* Заголовок секции */}
        <div className={styles.services__header}>
          <h2 id="services-heading" className={styles.services__title}>
            {t('title')}
          </h2>
          <p className={styles.services__subtitle}>{t('subtitle')}</p>
        </div>

        <div className={styles.services__grid}>
          {keys.map(key => {
            const isHighlight = key === 'solanto';
            return (
              <article
                key={key}
                className={`${styles.services__card} ${isHighlight ? styles.services__card_highlight : ''}`}
                aria-label={t(`items.${key}.title`)}
              >
                {/* Верхняя часть: иконка + бейдж */}
                <div className={styles.services__card_top}>
                  <div
                    className={styles.services__icon_wrap}
                    style={{ '--srv-accent': SERVICE_ACCENT[key] } as React.CSSProperties}
                    aria-hidden="true"
                  >
                    {SERVICE_ICONS[key]}
                  </div>

                  {isHighlight && (
                    <div className={styles.services__badge} aria-label="Специальный протокол">
                      <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
                      Специальный протокол
                    </div>
                  )}
                </div>

                {/* Название и описание */}
                <h3 className={styles.services__card_title}>{t(`items.${key}.title`)}</h3>

                <p className={styles.services__card_desc}>{t(`items.${key}.desc`)}</p>

                {/* Мета-теги: длительность и формат */}
                <div className={styles.services__meta}>
                  <span className={styles.services__meta_tag}>
                    <Clock size={14} strokeWidth={2} aria-hidden="true" />
                    {t(`items.${key}.durationVal`)}
                  </span>
                  <span className={styles.services__meta_tag}>
                    <Video size={14} strokeWidth={2} aria-hidden="true" />
                    Онлайн
                  </span>
                </div>

                {/* Разделитель */}
                <div className={styles.services__divider} aria-hidden="true" />

                {/* Цена */}
                <div className={styles.services__price_block}>
                  <div className={styles.services__price_label}>Стоимость</div>
                  <div className={styles.services__price_row}>
                    <span className={styles.services__price}>{t(`items.${key}.price`)}</span>
                    <span className={styles.services__currency}>{t('currency')}</span>
                  </div>
                </div>

                {/* Кнопка */}
                <a
                  href="#contact"
                  className={`${styles.services__btn} ${isHighlight ? styles.services__btn_highlight : ''}`}
                  aria-label={`Записаться: ${t(`items.${key}.title`)}`}
                >
                  {t('bookBtn')}
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
