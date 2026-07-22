import { locales, type AppLocale } from '@/i18n/config';
import {
  getAdminEventBookingTranslations,
  getAdminEventCancellationTranslations,
  getEmailTranslations
} from '@/lib/email-localization';
import { getPilloNotificationCopy } from '@/modules/pillo/notifications';
import { editableEmailTemplateKeys } from '@/modules/email-templates/types';
import type {
  EditableEmailTemplateKey,
  EmailTemplateDefinition,
  EmailTemplateDocument,
  EmailTemplateTokenDefinition
} from '@/modules/email-templates/types';

const textToken = (
  key: string,
  example: string,
  optional = false
): EmailTemplateTokenDefinition => ({ key, example, kind: 'text', optional });

const urlToken = (
  key: string,
  example: string,
  optional = false
): EmailTemplateTokenDefinition => ({ key, example, kind: 'url', optional });

const htmlToken = (key: string, example: string): EmailTemplateTokenDefinition => ({
  key,
  example,
  kind: 'html'
});

const userTokens = [textToken('name', 'Анна')];
const eventTokens = [
  ...userTokens,
  textToken('title', 'Индивидуальная консультация'),
  textToken('eventType', 'Консультация'),
  textToken('date', '22 июля 2026'),
  textToken('time', '14:00–15:00'),
  urlToken('meetLink', 'https://meet.google.com/preview', true),
  urlToken('manageUrl', 'https://vershkov.com/my')
];
const cancellationTokens = [...eventTokens, textToken('reason', 'Изменились планы', true)];
const adminEventTokens = [
  textToken('name', 'Анна'),
  textToken('userName', 'Мария Иванова'),
  textToken('userEmail', 'maria@example.com'),
  textToken('title', 'Индивидуальная консультация'),
  textToken('date', '22 июля 2026'),
  textToken('time', '14:00–15:00'),
  textToken('reason', 'Изменились планы', true),
  urlToken('manageUrl', 'https://vershkov.com/admin/schedule')
];

export const EMAIL_TEMPLATE_DEFINITIONS: EmailTemplateDefinition[] = [
  {
    key: 'VERIFICATION',
    category: 'account',
    tokens: [...userTokens, urlToken('verificationUrl', 'https://vershkov.com/auth/verify-email')]
  },
  {
    key: 'WELCOME_GOOGLE',
    category: 'account',
    tokens: [...userTokens, urlToken('dashboardUrl', 'https://vershkov.com/my')]
  },
  { key: 'EVENT_NOTIFICATION', category: 'schedule', tokens: eventTokens },
  { key: 'BOOKING_PENDING', category: 'schedule', tokens: eventTokens },
  { key: 'BOOKING_CONFIRMED', category: 'schedule', tokens: eventTokens },
  { key: 'EVENT_CANCELLATION', category: 'schedule', tokens: cancellationTokens },
  { key: 'BOOKING_REJECTED', category: 'schedule', tokens: cancellationTokens },
  {
    key: 'SESSION_REMINDER_SOON',
    category: 'schedule',
    tokens: [...eventTokens, textToken('minutes', '30')]
  },
  { key: 'SESSION_REMINDER_NOW', category: 'schedule', tokens: eventTokens },
  { key: 'ADMIN_EVENT_BOOKING', category: 'admin', tokens: adminEventTokens },
  { key: 'ADMIN_EVENT_CANCELLATION', category: 'admin', tokens: adminEventTokens },
  {
    key: 'ADMIN_MESSAGE',
    category: 'admin',
    tokens: [
      textToken('subject', 'Системное уведомление'),
      textToken('message', 'Текст уведомления')
    ]
  },
  {
    key: 'ADMIN_INTAKE',
    category: 'admin',
    tokens: [
      textToken('formId', 'intake-2026'),
      textToken('userId', 'client-42'),
      urlToken('dashboardUrl', 'https://vershkov.com/admin/clients')
    ]
  },
  {
    key: 'BLOG_NOTIFICATION',
    category: 'content',
    tokens: [
      textToken('title', 'Как бережно возвращать себе опору'),
      textToken('description', 'Краткое описание статьи'),
      textToken('authorName', 'Анна Вершкова', true),
      textToken('readingTime', '6'),
      textToken('publishedAt', '22 июля 2026'),
      urlToken('coverImage', 'https://vershkov.com/images/links/anna-consultation.jpg', true),
      urlToken('articleUrl', 'https://vershkov.com/blog/preview-article'),
      urlToken('unsubscribeUrl', 'https://vershkov.com/blog/unsubscribe', true),
      urlToken('settingsUrl', 'https://vershkov.com/my/settings')
    ]
  },
  {
    key: 'ACCOUNT_DELETION_REQUEST',
    category: 'account',
    tokens: [...userTokens, urlToken('deletionUrl', 'https://vershkov.com/account/delete')]
  },
  { key: 'ACCOUNT_DELETED_USER', category: 'account', tokens: userTokens },
  {
    key: 'ACCOUNT_DELETED_ADMIN',
    category: 'admin',
    tokens: [
      textToken('name', 'Анна'),
      textToken('email', 'anna@example.com'),
      textToken('deletedAt', '22.07.2026, 14:00')
    ]
  },
  {
    key: 'PILLO_INTAKE',
    category: 'pillo',
    tokens: [
      textToken('name', 'Анна'),
      textToken('medicationName', 'Препарат'),
      textToken('dose', '1 таблетка'),
      textToken('time', '22 июля, 14:00'),
      urlToken('actionUrl', 'https://vershkov.com/app/pillo/take'),
      urlToken('skipUrl', 'https://vershkov.com/app/pillo/skip')
    ]
  },
  {
    key: 'PILLO_LOW_STOCK',
    category: 'pillo',
    tokens: [
      textToken('name', 'Анна'),
      textToken('medicationName', 'Препарат'),
      textToken('stock', '5 таблеток'),
      urlToken('actionUrl', 'https://vershkov.com/app/pillo')
    ]
  },
  {
    key: 'PILLO_EMPTY_STOCK',
    category: 'pillo',
    tokens: [
      textToken('name', 'Анна'),
      textToken('medicationName', 'Препарат'),
      textToken('stock', '0 таблеток'),
      urlToken('actionUrl', 'https://vershkov.com/app/pillo')
    ]
  },
  {
    key: 'PILLO_COURSE_END',
    category: 'pillo',
    tokens: [
      textToken('name', 'Анна'),
      textToken('medicationName', 'Препарат'),
      textToken('courseEnd', '22 июля 2026'),
      urlToken('actionUrl', 'https://vershkov.com/app/pillo')
    ]
  },
  {
    key: 'FINANCIAL_NOTIFICATION',
    category: 'finance',
    tokens: [
      textToken('subject', 'Изменение баланса'),
      textToken('heading', 'Баланс обновлён'),
      textToken('greeting', 'Здравствуйте, Анна!'),
      textToken('message', 'На баланс зачислено 5 000 ₽.'),
      htmlToken('detailsHtml', '<p>Сумма: 5 000 ₽</p>'),
      textToken('actionText', 'Открыть баланс'),
      urlToken('actionUrl', 'https://vershkov.com/my/payments')
    ]
  }
];

const document = (subject: string, html: string, css = ''): EmailTemplateDocument => ({
  subject,
  html,
  css
});

const action = (hrefToken: string, label: string) =>
  `<p><a class="button" href="{${hrefToken}}">${label}</a></p>`;

const details = (items: Array<[string, string]>) =>
  `<table class="details" role="presentation"><tbody>${items
    .map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`)
    .join('')}</tbody></table>`;

interface EventCopy {
  subject: string;
  heading: string;
  greeting: string;
  message: string;
  dateLabel: string;
  timeLabel: string;
  typeLabel: string;
  meetLinkLabel?: string;
  reasonLabel?: string;
  button: string;
}

const eventDocument = (copy: EventCopy, options: { cancellation?: boolean } = {}) => {
  const rows: Array<[string, string]> = [
    [copy.typeLabel, '{eventType}'],
    [copy.dateLabel, '{date}'],
    [copy.timeLabel, '{time}']
  ];
  const meetLink = copy.meetLinkLabel ?? '';
  const reasonLabel = copy.reasonLabel ?? '';

  return document(
    copy.subject,
    `<h1>${copy.heading}</h1>
<p>${copy.greeting}</p>
<p>${copy.message}</p>
${details(rows)}
${meetLink ? `{{#if meetLink}}<p><strong>${meetLink}:</strong> <a href="{meetLink}">{meetLink}</a></p>{{/if}}` : ''}
${options.cancellation ? `{{#if reason}}<div class="notice notice-danger"><strong>${reasonLabel}:</strong> {reason}</div>{{/if}}` : ''}
${action('manageUrl', copy.button)}`
  );
};

const adminIntakeDefaults: Record<AppLocale, EmailTemplateDocument> = {
  ru: document(
    'Новая анкета клиента: {formId}',
    `<h1>Новая анкета</h1>
<p>Клиент только что заполнил анкету. Ответы доступны в панели администратора.</p>
${details([
  ['Анкета', '{formId}'],
  ['ID клиента', '{userId}']
])}
${action('dashboardUrl', 'Открыть ответы')}`
  ),
  en: document(
    'New client intake: {formId}',
    `<h1>New intake form</h1>
<p>A client has completed an intake form. The answers are available in the admin panel.</p>
${details([
  ['Form', '{formId}'],
  ['Client ID', '{userId}']
])}
${action('dashboardUrl', 'Open answers')}`
  ),
  sr: document(
    'Novi upitnik klijenta: {formId}',
    `<h1>Novi upitnik</h1>
<p>Klijent je popunio upitnik. Odgovori su dostupni u administratorskom panelu.</p>
${details([
  ['Upitnik', '{formId}'],
  ['ID klijenta', '{userId}']
])}
${action('dashboardUrl', 'Otvori odgovore')}`
  )
};

const adminMessageDefaults: Record<AppLocale, EmailTemplateDocument> = {
  ru: document(
    '{subject}',
    '<h1>Сообщение от администрации</h1>\n<p>Здравствуйте!</p>\n<div class="message">{message}</div>'
  ),
  en: document(
    '{subject}',
    '<h1>Message from the administration</h1>\n<p>Hello!</p>\n<div class="message">{message}</div>'
  ),
  sr: document(
    '{subject}',
    '<h1>Poruka administracije</h1>\n<p>Zdravo!</p>\n<div class="message">{message}</div>'
  )
};

const financialDefaults: Record<AppLocale, EmailTemplateDocument> = {
  ru: document(
    '{subject}',
    '<h1>{heading}</h1>\n<p>{greeting}</p>\n<p>{message}</p>\n<div class="details">{detailsHtml}</div>\n' +
      action('actionUrl', '{actionText}')
  ),
  en: document(
    '{subject}',
    '<h1>{heading}</h1>\n<p>{greeting}</p>\n<p>{message}</p>\n<div class="details">{detailsHtml}</div>\n' +
      action('actionUrl', '{actionText}')
  ),
  sr: document(
    '{subject}',
    '<h1>{heading}</h1>\n<p>{greeting}</p>\n<p>{message}</p>\n<div class="details">{detailsHtml}</div>\n' +
      action('actionUrl', '{actionText}')
  )
};

/** Возвращает декларацию доступного для редактирования шаблона. */
export const getEmailTemplateDefinition = (
  template: EditableEmailTemplateKey
): EmailTemplateDefinition => {
  const definition = EMAIL_TEMPLATE_DEFINITIONS.find(item => item.key === template);
  if (!definition) throw new Error(`Неизвестный шаблон письма: ${template}`);
  return definition;
};

/** Возвращает встроенный HTML-документ шаблона для указанной локали. */
export const getDefaultEmailTemplateContent = (
  template: EditableEmailTemplateKey,
  locale: AppLocale
): EmailTemplateDocument => {
  const email = getEmailTranslations(locale);

  if (template === 'VERIFICATION') {
    const copy = email.verification;
    return document(
      copy.subject,
      `<h1>${copy.heading}</h1>\n<p>${copy.greeting}</p>\n<p>${copy.message}</p>\n${action('verificationUrl', copy.button)}\n<p class="muted">${copy.linkHint}</p>\n<p><a href="{verificationUrl}">{verificationUrl}</a></p>\n<p class="muted">${copy.expiry}</p>`
    );
  }

  if (template === 'WELCOME_GOOGLE') {
    const copy = email.welcomeGoogle;
    return document(
      copy.subject,
      `<h1>${copy.heading}</h1>\n<p>${copy.greeting}</p>\n<p>${copy.message}</p>\n${action('dashboardUrl', copy.button)}`
    );
  }

  if (template === 'EVENT_NOTIFICATION') return eventDocument(email.eventNotification);
  if (template === 'BOOKING_PENDING') return eventDocument(email.bookingPending);
  if (template === 'BOOKING_CONFIRMED') return eventDocument(email.bookingConfirmed);
  if (template === 'EVENT_CANCELLATION')
    return eventDocument(email.eventCancellation, { cancellation: true });
  if (template === 'BOOKING_REJECTED')
    return eventDocument(email.bookingRejected, { cancellation: true });

  if (template === 'SESSION_REMINDER_SOON' || template === 'SESSION_REMINDER_NOW') {
    const copy = email.sessionReminder;
    const isNow = template === 'SESSION_REMINDER_NOW';
    return document(
      isNow ? copy.subjectNow : copy.subjectInMinutes,
      `<h1>${isNow ? copy.headingNow : copy.headingInMinutes}</h1>
<p>${copy.greeting}</p>
<p>${isNow ? copy.messageNow : copy.messageInMinutes}</p>
${details([
  [copy.typeLabel, '{eventType}'],
  [copy.dateLabel, '{date}'],
  [copy.timeLabel, '{time}']
])}
{{#if meetLink}}<p><strong>${copy.meetLinkLabel}:</strong> <a href="{meetLink}">{meetLink}</a></p>{{/if}}
${action('manageUrl', copy.button)}`
    );
  }

  if (template === 'ADMIN_EVENT_BOOKING' || template === 'ADMIN_EVENT_CANCELLATION') {
    const isCancellation = template === 'ADMIN_EVENT_CANCELLATION';
    const copy = isCancellation
      ? getAdminEventCancellationTranslations(locale)
      : getAdminEventBookingTranslations(locale);
    return document(
      copy.subject,
      `<h1>${copy.greeting}</h1>
<p>${copy.message}</p>
${details([
  [copy.details.user, '{userName} ({userEmail})'],
  [copy.details.event, '{title}'],
  [copy.details.date, '{date}'],
  [copy.details.time, '{time}']
])}
${isCancellation ? `{{#if reason}}<div class="notice notice-danger"><strong>${'reason' in copy.details ? copy.details.reason : ''}</strong> {reason}</div>{{/if}}` : ''}
${action('manageUrl', copy.button)}`
    );
  }

  if (template === 'ADMIN_MESSAGE') return adminMessageDefaults[locale];
  if (template === 'ADMIN_INTAKE') return adminIntakeDefaults[locale];

  if (template === 'BLOG_NOTIFICATION') {
    const copy = {
      ru: [
        'Новая статья в блоге',
        'Автор',
        'мин чтения',
        'Читать статью',
        'Вы получили это письмо, потому что подписались на обновления блога.',
        'Отписаться',
        'Управлять уведомлениями'
      ],
      en: [
        'New blog article',
        'by',
        'min read',
        'Read article',
        'You received this email because you subscribed to blog updates.',
        'Unsubscribe',
        'Manage notifications'
      ],
      sr: [
        'Novi blog članak',
        'autor',
        'min čitanja',
        'Pročitajte članak',
        'Dobili ste ovaj email jer ste se pretplatili na blog novosti.',
        'Otpretplatite se',
        'Upravljajte obaveštenjima'
      ]
    }[locale];
    return document(
      '{title}',
      `{{#if coverImage}}<img class="cover" src="{coverImage}" alt="{title}">{{/if}}
<p class="eyebrow">${copy[0]}</p>
<h1>{title}</h1>
<p class="meta">{{#if authorName}}${copy[1]} {authorName} · {{/if}}{readingTime} ${copy[2]} · {publishedAt}</p>
<p>{description}</p>
${action('articleUrl', copy[3])}
<p class="muted">${copy[4]}</p>
<p class="muted">{{#if unsubscribeUrl}}<a href="{unsubscribeUrl}">${copy[5]}</a>{{/if}}{{#if unsubscribeUrl}} · {{/if}}<a href="{settingsUrl}">${copy[6]}</a></p>`
    );
  }

  if (template === 'ACCOUNT_DELETION_REQUEST') {
    const copy = email.accountDeletionRequest;
    return document(
      copy.subject,
      `<h1>${copy.heading}</h1>\n<p>${copy.greeting}</p>\n<p>${copy.message}</p>\n<div class="notice notice-danger">${copy.warning}</div>\n${action('deletionUrl', copy.button)}\n<p class="muted">${copy.linkHint}</p>\n<p><a href="{deletionUrl}">{deletionUrl}</a></p>\n<p class="muted">${copy.expiry}</p>`
    );
  }

  if (template === 'ACCOUNT_DELETED_USER') {
    const copy = email.accountDeleted;
    return document(
      copy.subject,
      `<h1>${copy.heading}</h1>\n<p>${copy.greeting}</p>\n<p>${copy.message}</p>`
    );
  }

  if (template === 'ACCOUNT_DELETED_ADMIN') {
    const copy = email.adminAccountDeleted;
    return document(
      copy.subject,
      `<h1>${copy.heading}</h1>\n<p>${copy.message}</p>\n${details([
        ['Email', '{email}'],
        [copy.dateLabel, '{deletedAt}']
      ])}`
    );
  }

  if (template.startsWith('PILLO_')) {
    const copy = getPilloNotificationCopy(locale);
    const configuration = {
      PILLO_INTAKE: {
        subject: copy.intakeSubject,
        heading: copy.intakeHeading,
        message: copy.intakeMessage,
        rows: [
          [copy.medicationLabel, '{medicationName}'],
          [copy.doseLabel, '{dose}'],
          [copy.timeLabel, '{time}']
        ] as Array<[string, string]>,
        actions: `${action('actionUrl', copy.takeButton)}${action('skipUrl', copy.skipButton)}`
      },
      PILLO_LOW_STOCK: {
        subject: copy.lowStockSubject,
        heading: copy.lowStockHeading,
        message: copy.lowStockMessage,
        rows: [
          [copy.medicationLabel, '{medicationName}'],
          [copy.stockLabel, '{stock}']
        ] as Array<[string, string]>,
        actions: action('actionUrl', copy.openButton)
      },
      PILLO_EMPTY_STOCK: {
        subject: copy.emptyStockSubject,
        heading: copy.emptyStockHeading,
        message: copy.emptyStockMessage,
        rows: [
          [copy.medicationLabel, '{medicationName}'],
          [copy.stockLabel, '{stock}']
        ] as Array<[string, string]>,
        actions: action('actionUrl', copy.openButton)
      },
      PILLO_COURSE_END: {
        subject: copy.courseEndSubject,
        heading: copy.courseEndHeading,
        message: copy.courseEndMessage,
        rows: [
          [copy.medicationLabel, '{medicationName}'],
          [copy.courseLabel, '{courseEnd}']
        ] as Array<[string, string]>,
        actions: action('actionUrl', copy.openButton)
      }
    }[template as 'PILLO_INTAKE' | 'PILLO_LOW_STOCK' | 'PILLO_EMPTY_STOCK' | 'PILLO_COURSE_END'];

    return document(
      configuration.subject,
      `<h1>${configuration.heading}</h1>\n<p>${copy.greeting}</p>\n<p>${configuration.message}</p>\n${details(configuration.rows)}\n${configuration.actions}`
    );
  }

  if (template === 'FINANCIAL_NOTIFICATION') return financialDefaults[locale];

  throw new Error(`Для шаблона ${template} отсутствует HTML по умолчанию`);
};

export const getEmailTemplateEditorKeys = (): EditableEmailTemplateKey[] => [
  ...editableEmailTemplateKeys
];

export const getEmailTemplateEditorLocales = (): AppLocale[] => [...locales];
