'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import styles from './contact-form.module.css';

/**
 * Валидационная схема формы записи на консультацию.
 */
const createContactSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, { message: t('validation.nameMin') }),
    contact: z.string().min(1, { message: t('validation.contactMin') }),
    time: z.string().min(1, { message: t('validation.timeRequired') })
  });

type ContactFormValues = z.infer<ReturnType<typeof createContactSchema>>;

/**
 * Доступная форма обратной связи для записи на консультацию.
 * Реализует валидацию через react-hook-form + zod.
 */
export const ContactForm = () => {
  const t = useTranslations('Home.contact');
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<ContactFormValues>({
    resolver: zodResolver(createContactSchema(t)),
    defaultValues: {
      name: '',
      contact: '',
      time: ''
    }
  });

  const onSubmit = async (data: ContactFormValues) => {
    // Симуляция отправки на сервер
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSuccess(true);
    reset();
  };

  if (isSuccess) {
    return (
      <section className={styles.contact} id="contact">
        <div className={styles.contact__container}>
          <div className={styles.contact__success} role="alert" aria-live="assertive">
            <CheckCircle2 className={styles.contact__success_icon} size={64} />
            <h2 className={styles.contact__success_title}>{t('successTitle')}</h2>
            <p className={styles.contact__success_desc}>{t('successDesc')}</p>
            <button
              type="button"
              className={styles.contact__btn}
              onClick={() => setIsSuccess(false)}
            >
              Отправить ещё одну заявку
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.contact} id="contact">
      <div className={styles.contact__container}>
        <div className={styles.contact__header}>
          <h2 className={styles.contact__title}>{t('title')}</h2>
          <p className={styles.contact__subtitle}>{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.contact__form} noValidate>
          {/* Поле: Имя */}
          <div className={styles.contact__field}>
            <label htmlFor="contact-name" className={styles.contact__label}>
              {t('nameLabel')} <span className={styles.contact__required}>*</span>
            </label>
            <input
              id="contact-name"
              type="text"
              autoComplete="name"
              disabled={isSubmitting}
              className={`${styles.contact__input} ${errors.name ? styles.contact__input_error : ''}`}
              placeholder={t('namePlaceholder')}
              aria-required="true"
              aria-describedby={errors.name ? 'error-name' : undefined}
              {...register('name')}
            />
            <div className={styles.contact__error_container} aria-live="polite">
              {errors.name && (
                <span id="error-name" className={styles.contact__error}>
                  {errors.name.message}
                </span>
              )}
            </div>
          </div>

          {/* Поле: Контакт */}
          <div className={styles.contact__field}>
            <label htmlFor="contact-info" className={styles.contact__label}>
              {t('contactLabel')} <span className={styles.contact__required}>*</span>
            </label>
            <input
              id="contact-info"
              type="text"
              disabled={isSubmitting}
              className={`${styles.contact__input} ${errors.contact ? styles.contact__input_error : ''}`}
              placeholder={t('contactPlaceholder')}
              aria-required="true"
              aria-describedby={errors.contact ? 'error-contact' : undefined}
              {...register('contact')}
            />
            <div className={styles.contact__error_container} aria-live="polite">
              {errors.contact && (
                <span id="error-contact" className={styles.contact__error}>
                  {errors.contact.message}
                </span>
              )}
            </div>
          </div>

          {/* Поле: Предпочтительное время */}
          <div className={styles.contact__field}>
            <label htmlFor="contact-time" className={styles.contact__label}>
              {t('timeLabel')} <span className={styles.contact__required}>*</span>
            </label>
            <select
              id="contact-time"
              disabled={isSubmitting}
              className={`${styles.contact__input} ${errors.time ? styles.contact__input_error : ''}`}
              aria-required="true"
              aria-describedby={errors.time ? 'error-time' : undefined}
              {...register('time')}
            >
              <option value="" disabled hidden>
                {t('timePlaceholder')}
              </option>
              <option value="morning">{t('timeMorning')}</option>
              <option value="afternoon">{t('timeAfternoon')}</option>
              <option value="evening">{t('timeEvening')}</option>
            </select>
            <div className={styles.contact__error_container} aria-live="polite">
              {errors.time && (
                <span id="error-time" className={styles.contact__error}>
                  {errors.time.message}
                </span>
              )}
            </div>
          </div>

          {/* Кнопка отправки */}
          <button type="submit" disabled={isSubmitting} className={styles.contact__btn}>
            {isSubmitting ? (
              <>
                <Loader2 className={styles.contact__btn_spinner} size={20} />
                <span>{t('sending')}</span>
              </>
            ) : (
              <>
                <Send size={18} className={styles.contact__btn_icon} />
                <span>{t('submitBtn')}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
};
