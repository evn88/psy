import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { isPilloAllowedRole } from './service';

export type PilloAuthorizedUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  language?: string | null;
};

/**
 * Возвращает пользователя Pillo или перенаправляет на безопасный маршрут.
 * @returns Пользователь с ролью ADMIN или USER.
 */
export const requirePilloUser = async (): Promise<PilloAuthorizedUser> => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth');
  }

  if (!isPilloAllowedRole(session.user.role)) {
    redirect('/my/profile');
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    language: session.user.language
  };
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
