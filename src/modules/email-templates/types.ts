import type { AppLocale } from '@/i18n/config';

export const editableEmailTemplateKeys = [
  'VERIFICATION',
  'WELCOME_GOOGLE',
  'EVENT_NOTIFICATION',
  'BOOKING_PENDING',
  'BOOKING_CONFIRMED',
  'EVENT_CANCELLATION',
  'BOOKING_REJECTED',
  'SESSION_REMINDER_SOON',
  'SESSION_REMINDER_NOW',
  'ADMIN_EVENT_BOOKING',
  'ADMIN_EVENT_CANCELLATION',
  'ADMIN_MESSAGE',
  'ADMIN_INTAKE',
  'BLOG_NOTIFICATION',
  'ACCOUNT_DELETION_REQUEST',
  'ACCOUNT_DELETED_USER',
  'ACCOUNT_DELETED_ADMIN',
  'PILLO_INTAKE',
  'PILLO_LOW_STOCK',
  'PILLO_EMPTY_STOCK',
  'PILLO_COURSE_END',
  'FINANCIAL_NOTIFICATION'
] as const;

export type EditableEmailTemplateKey = (typeof editableEmailTemplateKeys)[number];

export interface EmailTemplateDocument {
  subject: string;
  html: string;
  css: string;
}

export type EmailTemplateContent = EmailTemplateDocument;
export type EmailTemplateContentByKey = Record<EditableEmailTemplateKey, EmailTemplateDocument>;

export interface EmailTemplateTokenDefinition {
  key: string;
  example: string;
  kind: 'text' | 'url' | 'html';
  optional?: boolean;
}

export interface EmailTemplateDefinition {
  key: EditableEmailTemplateKey;
  category: 'account' | 'schedule' | 'admin' | 'content' | 'pillo' | 'finance';
  tokens: EmailTemplateTokenDefinition[];
}

export interface EmailTemplateEditorValue {
  template: EditableEmailTemplateKey;
  locale: AppLocale;
  content: EmailTemplateDocument;
  isOverridden: boolean;
  isDirty?: boolean;
}

export interface EmailTemplateAdminRecipient {
  id: string;
  name: string | null;
  email: string;
}
