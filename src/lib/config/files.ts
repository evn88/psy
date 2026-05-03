/**
 * Константы для работы с файлами.
 */
export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20 МБ

/** Максимальный размер изображения обложки блога */
export const MAX_BLOG_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 МБ

/** Допустимые MIME-типы для документов клиентов */
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] as const;

export type AllowedDocumentType = (typeof ALLOWED_DOCUMENT_TYPES)[number];
