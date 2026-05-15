import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  getPilloGuestEmail,
  isPilloGuestEmail,
  isPilloGuestToken,
  PILLO_GUEST_COOKIE_NAME
} from '@/modules/pillo/guest';
import { isPilloAllowedRole } from './service';

export type PilloAuthorizedUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  language?: string | null;
  isAnonymousGuest: boolean;
};

/**
 * Возвращает пользователя Pillo из сессии или гостевого cookie.
 * @returns Пользователь с доступом к Pillo или `null`, если доступ не найден.
 */
export const resolvePilloUser = async (): Promise<PilloAuthorizedUser | null> => {
  const session = await auth();

  if (session?.user?.id) {
    if (!isPilloAllowedRole(session.user.role)) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      language: session.user.language,
      isAnonymousGuest: false
    };
  }

  const cookieStore = await cookies();
  const guestToken = cookieStore.get(PILLO_GUEST_COOKIE_NAME)?.value;

  if (!isPilloGuestToken(guestToken)) {
    return null;
  }

  const guestEmail = getPilloGuestEmail(guestToken);
  const guestUser = await prisma.user.upsert({
    where: { email: guestEmail },
    update: {
      isDisabled: false
    },
    create: {
      email: guestEmail,
      name: 'Pillo Guest',
      role: Role.GUEST,
      language: 'ru'
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      language: true
    }
  });

  return {
    ...guestUser,
    isAnonymousGuest: isPilloGuestEmail(guestUser.email)
  };
};

/**
 * Возвращает пользователя Pillo или перенаправляет на безопасный маршрут.
 * @returns Пользователь с ролью ADMIN, USER или технический GUEST для анонимного Pillo.
 */
export const requirePilloUser = async (): Promise<PilloAuthorizedUser> => {
  const user = await resolvePilloUser();

  if (!user) {
    redirect('/auth');
  }

  return user;
};

/**
 * Возвращает id пользователя Pillo для server action.
 * @returns Идентификатор пользователя.
 */
export const requirePilloUserId = async (): Promise<string> => {
  const user = await requirePilloUser();
  return user.id;
};

/**
 * Проверяет доступ к Pillo через БД, если сессионной роли недостаточно.
 * @param userId - идентификатор пользователя.
 * @returns `true`, если пользователь имеет доступ.
 */
export const canUsePillo = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isDisabled: true }
  });

  return Boolean(user && !user.isDisabled && isPilloAllowedRole(user.role));
};
