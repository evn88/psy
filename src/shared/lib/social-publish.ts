import type { BlogPost, BlogPostTranslation } from '@prisma/client';

/**
 * Публикация статьи в Telegraph.
 * TODO: Реализовать интеграцию с Telegraph API (https://telegra.ph/api)
 */
export async function publishToTelegraph(
  _post: BlogPost,

  _translation: BlogPostTranslation
): Promise<void> {
  // Заглушка — будет реализована в будущем
}

/**
 * Публикация статьи в Telegram-канал.
 * TODO: Реализовать интеграцию с Telegram Bot API
 */
export async function publishToTelegramChannel(
  _post: BlogPost,

  _translation: BlogPostTranslation
): Promise<void> {
  // Заглушка — будет реализована в будущем
}
