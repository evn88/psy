export const PILLO_GUEST_COOKIE_NAME = 'pillo_guest_token';
export const PILLO_GUEST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const PILLO_GUEST_EMAIL_DOMAIN = 'pillo-guest.local';

const PILLO_GUEST_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Проверяет, что cookie-токен гостевого Pillo имеет формат UUID v4.
 * @param token - значение cookie.
 * @returns true, если токен подходит для поиска гостевого пользователя.
 */
export const isPilloGuestToken = (token: string | undefined): token is string => {
  return Boolean(token && PILLO_GUEST_TOKEN_PATTERN.test(token));
};

/**
 * Строит технический email гостевого пользователя Pillo.
 * @param token - валидный гостевой токен.
 * @returns Уникальный email для Prisma User.
 */
export const getPilloGuestEmail = (token: string): string => {
  return `pillo-guest-${token}@${PILLO_GUEST_EMAIL_DOMAIN}`;
};

/**
 * Проверяет, что email принадлежит техническому анонимному пользователю Pillo.
 * @param email - email пользователя из БД.
 * @returns true для гостевого технического email.
 */
export const isPilloGuestEmail = (email: string | null | undefined): boolean => {
  return Boolean(email?.endsWith(`@${PILLO_GUEST_EMAIL_DOMAIN}`));
};
