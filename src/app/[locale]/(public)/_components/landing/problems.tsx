'use client';

import { useTranslations } from 'next-intl';
import { Compass, Brain, Clock, HeartPulse, ShieldAlert, Flame } from 'lucide-react';
import styles from './problems.module.css';

const iconMap = {
  avoidance: Compass,
  neurodiversity: Brain,
  procrastination: Clock,
  rpp: HeartPulse,
  anxiety: ShieldAlert,
  burnout: Flame
};

type ProblemKey = keyof typeof iconMap;

export const Problems = () => {
  const t = useTranslations('Home.problems');

  const keys: ProblemKey[] = [
    'avoidance',
    'neurodiversity',
    'procrastination',
    'rpp',
    'anxiety',
    'burnout'
  ];

  return (
    <section className={styles.problems} id="problems">
      <div className={styles.problems__container}>
        <div className={styles.problems__header}>
          <h2 className={styles.problems__title}>{t('title')}</h2>
          <p className={styles.problems__subtitle}>{t('subtitle')}</p>
        </div>

        <div className={styles.problems__grid}>
          {keys.map(key => {
            const Icon = iconMap[key];
            return (
              <div key={key} className={styles.problems__card}>
                <div className={styles.problems__icon_wrapper} data-icon={key}>
                  <Icon className={styles.problems__icon} size={28} />
                </div>
                <h3 className={styles.problems__card_title}>{t(`items.${key}.title`)}</h3>
                <p className={styles.problems__card_desc}>{t(`items.${key}.desc`)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
