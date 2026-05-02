import { formatInTimeZone } from 'date-fns-tz';

import { defaultLocale, isLocale, type AppLocale } from '@/i18n/config';

type PilloNotificationCopy = {
  intakeSubject: string;
  intakeHeading: string;
  intakeMessage: string;
  lowStockSubject: string;
  lowStockHeading: string;
  lowStockMessage: string;
  emptyStockSubject: string;
  emptyStockHeading: string;
  emptyStockMessage: string;
  courseEndSubject: string;
  courseEndHeading: string;
  courseEndMessage: string;
  greeting: string;
  medicationLabel: string;
  doseLabel: string;
  timeLabel: string;
  stockLabel: string;
  courseLabel: string;
  takeButton: string;
  skipButton: string;
  openButton: string;
  footer: string;
  pushIntakeTitle: string;
  pushIntakeBody: string;
  pushLowStockTitle: string;
  pushLowStockBody: string;
  pushEmptyStockTitle: string;
  pushEmptyStockBody: string;
  pushCourseEndTitle: string;
  pushCourseEndBody: string;
};

const COPY: Record<AppLocale, PilloNotificationCopy> = {
  ru: {
    intakeSubject: 'Пора принять лекарство - Pillo',
    intakeHeading: 'Пора принять лекарство',
    intakeMessage: 'Отметьте приём, когда примете лекарство.',
    lowStockSubject: 'Пора купить лекарство - Pillo',
    lowStockHeading: 'Пора пополнить запас',
    lowStockMessage: 'Остаток лекарства достиг минимального порога.',
    emptyStockSubject: 'Лекарство закончилось - Pillo',
    emptyStockHeading: 'Лекарство закончилось',
    emptyStockMessage: 'Запас лекарства практически исчерпан. Необходимо срочно пополнить.',
    courseEndSubject: 'Курс приёма завершён - Pillo',
    courseEndHeading: 'Курс приёма завершён',
    courseEndMessage:
      'Расписание приёма подошло к концу. Не забудьте проконсультироваться с врачом при необходимости.',
    greeting: 'Здравствуйте, {name}!',
    medicationLabel: 'Лекарство',
    doseLabel: 'Доза',
    timeLabel: 'Время',
    stockLabel: 'Остаток',
    courseLabel: 'Расписание',
    takeButton: 'Отметить как принято',
    skipButton: 'Пропустить',
    openButton: 'Открыть Pillo',
    footer: 'Это автоматическое уведомление Pillo. Пожалуйста, не отвечайте на него.',
    pushIntakeTitle: 'Пора принять лекарство',
    pushIntakeBody: '{name}: {dose}',
    pushLowStockTitle: 'Пора купить',
    pushLowStockBody: '{name}: осталось {stock}',
    pushEmptyStockTitle: 'Лекарство закончилось',
    pushEmptyStockBody: '{name}: осталось {stock}, срочно пополните',
    pushCourseEndTitle: 'Курс завершён',
    pushCourseEndBody: '{name}: расписание приёма окончено'
  },
  en: {
    intakeSubject: 'Time to take your medicine - Pillo',
    intakeHeading: 'Time to take your medicine',
    intakeMessage: 'Mark the dose as taken after you take it.',
    lowStockSubject: 'Time to buy medicine - Pillo',
    lowStockHeading: 'Time to refill your stock',
    lowStockMessage: 'The medicine stock reached the minimum threshold.',
    emptyStockSubject: 'Medicine is out of stock - Pillo',
    emptyStockHeading: 'Medicine is out of stock',
    emptyStockMessage: 'Your medicine stock is critically low. Please refill immediately.',
    courseEndSubject: 'Course completed - Pillo',
    courseEndHeading: 'Course completed',
    courseEndMessage: 'Your medication schedule has ended. Please consult your doctor if needed.',
    greeting: 'Hello, {name}!',
    medicationLabel: 'Medicine',
    doseLabel: 'Dose',
    timeLabel: 'Time',
    stockLabel: 'Stock',
    courseLabel: 'Schedule',
    takeButton: 'Mark as taken',
    skipButton: 'Skip',
    openButton: 'Open Pillo',
    footer: 'This is an automated Pillo notification. Please do not reply.',
    pushIntakeTitle: 'Time to take medicine',
    pushIntakeBody: '{name}: {dose}',
    pushLowStockTitle: 'Time to buy',
    pushLowStockBody: '{name}: {stock} left',
    pushEmptyStockTitle: 'Out of stock',
    pushEmptyStockBody: '{name}: {stock} left, refill urgently',
    pushCourseEndTitle: 'Course completed',
    pushCourseEndBody: '{name}: medication schedule ended'
  },
  sr: {
    intakeSubject: 'Vreme je za lek - Pillo',
    intakeHeading: 'Vreme je za lek',
    intakeMessage: 'Označite dozu kao uzetu nakon što uzmete lek.',
    lowStockSubject: 'Vreme je za kupovinu leka - Pillo',
    lowStockHeading: 'Vreme je da dopunite zalihe',
    lowStockMessage: 'Zaliha leka je dostigla minimalni prag.',
    emptyStockSubject: 'Leka više nema - Pillo',
    emptyStockHeading: 'Leka više nema',
    emptyStockMessage: 'Zaliha leka je kritično niska. Hitno dopunite zalihe.',
    courseEndSubject: 'Kurs je završen - Pillo',
    courseEndHeading: 'Kurs je završen',
    courseEndMessage: 'Raspored uzimanja leka je završen. Konsultujte se sa lekarom po potrebi.',
    greeting: 'Zdravo, {name}!',
    medicationLabel: 'Lek',
    doseLabel: 'Doza',
    timeLabel: 'Vreme',
    stockLabel: 'Zaliha',
    courseLabel: 'Raspored',
    takeButton: 'Označi kao uzeto',
    skipButton: 'Preskoči',
    openButton: 'Otvori Pillo',
    footer: 'Ovo je automatsko Pillo obaveštenje. Molimo ne odgovarajte na njega.',
    pushIntakeTitle: 'Vreme je za lek',
    pushIntakeBody: '{name}: {dose}',
    pushLowStockTitle: 'Vreme je za kupovinu',
    pushLowStockBody: '{name}: ostalo {stock}',
    pushEmptyStockTitle: 'Leka više nema',
    pushEmptyStockBody: '{name}: ostalo {stock}, hitno dopunite',
    pushCourseEndTitle: 'Kurs je završen',
    pushCourseEndBody: '{name}: raspored uzimanja je završen'
  }
};

/**
 * Возвращает базовый URL приложения.
 * @returns Абсолютный URL сайта.
 */
export const getPilloBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.PROD_DOMAIN) {
    return process.env.PROD_DOMAIN;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3000';
};

/**
 * Нормализует locale для уведомлений Pillo.
 * @param locale - locale пользователя.
 * @returns Поддерживаемая locale.
 */
export const normalizePilloLocale = (locale?: string | null): AppLocale => {
  return locale && isLocale(locale) ? locale : defaultLocale;
};

/**
 * Возвращает локализованные тексты Pillo.
 * @param locale - locale пользователя.
 * @returns Набор строк для email и push.
 */
export const getPilloNotificationCopy = (locale?: string | null): PilloNotificationCopy => {
  return COPY[normalizePilloLocale(locale)];
};

/**
 * Формирует ссылку на экран подтверждения приёма.
 * @param params - locale и одноразовый токен.
 * @returns Абсолютная ссылка.
 */
export const getPilloTakeUrl = (params: { locale?: string | null; token: string }): string => {
  const locale = normalizePilloLocale(params.locale);
  return `${getPilloBaseUrl()}/${locale}/app/pillo/take/${encodeURIComponent(params.token)}`;
};

/**
 * Формирует ссылку на экран пропуска приёма.
 * @param params - locale и одноразовый токен.
 * @returns Абсолютная ссылка с query-параметром action=skip.
 */
export const getPilloSkipUrl = (params: { locale?: string | null; token: string }): string => {
  const locale = normalizePilloLocale(params.locale);
  return `${getPilloBaseUrl()}/${locale}/app/pillo/take/${encodeURIComponent(params.token)}?action=skip`;
};

/**
 * Формирует ссылку на Pillo.
 * @param locale - locale пользователя.
 * @returns Абсолютная ссылка на мини-приложение.
 */
export const getPilloAppUrl = (locale?: string | null): string => {
  return `${getPilloBaseUrl()}/${normalizePilloLocale(locale)}/app/pillo`;
};

/**
 * Форматирует время приёма для письма.
 * @param params - дата, timezone и locale пользователя.
 * @returns Локализованная дата и время.
 */
export const formatPilloIntakeDateTime = (params: {
  scheduledFor: Date | string;
  timezone: string;
  locale?: string | null;
}) => {
  const locale = normalizePilloLocale(params.locale);
  const date = new Date(params.scheduledFor);

  return formatInTimeZone(date, params.timezone, 'dd.MM.yyyy HH:mm', {
    locale: undefined
  }).replace(' ', locale === 'en' ? ', ' : ' ');
};

/**
 * Подставляет простые переменные в шаблон.
 * @param template - строка с `{key}`.
 * @param vars - значения переменных.
 * @returns Строка с подставленными значениями.
 */
export const interpolatePilloCopy = (template: string, vars: Record<string, string>): string => {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template
  );
};
