'use client';

import { useTranslations } from 'next-intl';
import { Award, BookOpen, GraduationCap } from 'lucide-react';
import styles from './about.module.css';

interface EduItem {
  year: string;
  title: string;
  desc: string;
}

export const About = () => {
  const t = useTranslations('Home.about');
  const tHome = useTranslations('Home');

  // Получаем массив элементов образования. Так как next-intl возвращает raw при работе с массивами в JSON:
  const eduItems = t.raw('eduItems') as EduItem[];

  return (
    <section className={styles.about} id="about">
      <div className={styles.about__container}>
        <div className={styles.about__grid}>
          {/* Левая колонка: Описание подхода и личная история */}
          <div className={styles.about__info}>
            <h2 className={styles.about__title}>{t('title')}</h2>
            <h3 className={styles.about__intro_title}>{t('introTitle')}</h3>
            <p className={styles.about__text}>{t('p1')}</p>
            <p className={styles.about__text}>{t('p2')}</p>
            <p className={styles.about__text}>{t('p3')}</p>

            <div className={styles.about__tags_title}>Ключевые компетенции:</div>
            <div className={styles.about__tags}>
              {(tHome.raw('tags') as string[]).map(tag => (
                <span key={tag} className={styles.about__tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Правая колонка: Образование (Таймлайн) */}
          <div className={styles.about__education}>
            <h3 className={styles.about__edu_title}>
              <GraduationCap className={styles.about__edu_icon} size={28} />
              {t('educationTitle')}
            </h3>

            <div className={styles.about__timeline}>
              {eduItems.map((item, index) => (
                <div key={index} className={styles.about__timeline_item}>
                  <div className={styles.about__timeline_dot} />
                  <div className={styles.about__timeline_year}>{item.year}</div>
                  <div className={styles.about__timeline_content}>
                    <h4 className={styles.about__timeline_title}>{item.title}</h4>
                    <p className={styles.about__timeline_desc}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
