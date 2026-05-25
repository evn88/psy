import { type AppLocale } from '@/i18n/config';
import { redirect } from '@/i18n/navigation';

/**
 * Возвращает авторизованного пользователя или выполняет locale-aware redirect на страницу входа.
 * Дополнительный `throw` нужен только для корректного сужения типов после redirect.
 *
 * @param user - пользователь из сессии.
 * @param locale - активная локаль.
 * @returns Авторизованный пользователь.
 *
 * @example
 * ```ts
 * const user = requireAuthenticatedUser(session?.user, currentLocale);
 * ```
 */
export const requireAuthenticatedUser = <TUser>(
  user: TUser | null | undefined,
  locale: AppLocale
): TUser => {
  if (!user) {
    redirect({ href: '/auth', locale });
    throw new Error('UNREACHABLE_AUTH_REDIRECT');
  }

  return user;
};
