'use client';

import { useTranslations } from 'next-intl';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import styles from './faq.module.css';

type FAQKey = 'q1' | 'q2' | 'q3' | 'q4' | 'q5';

export const FAQ = () => {
  const t = useTranslations('Home.faq');

  const keys: FAQKey[] = ['q1', 'q2', 'q3', 'q4', 'q5'];

  return (
    <section className={styles.faq} id="faq">
      <div className={styles.faq__container}>
        <div className={styles.faq__header}>
          <h2 className={styles.faq__title}>{t('title')}</h2>
          <p className={styles.faq__subtitle}>{t('subtitle')}</p>
        </div>

        <Accordion.Root type="single" collapsible className={styles.faq__accordion}>
          {keys.map(key => (
            <Accordion.Item key={key} value={key} className={styles.faq__item}>
              <Accordion.Header className={styles.faq__item_header}>
                <Accordion.Trigger className={styles.faq__trigger}>
                  <span className={styles.faq__question}>{t(`items.${key}.question`)}</span>
                  <ChevronDown className={styles.faq__icon} size={20} aria-hidden="true" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className={styles.faq__content}>
                <div className={styles.faq__answer}>{t(`items.${key}.answer`)}</div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
};
