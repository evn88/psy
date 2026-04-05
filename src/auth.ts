import NextAuth, { AuthError } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import WebAuthn from 'next-auth/providers/webauthn';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { Role } from '@prisma/client';
import prisma from '@/shared/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Adapter } from 'next-auth/adapters';
import { authConfig } from './auth.config';
import { getRPID } from '@/app/api/profile/passkeys/register/config';
import { sendWelcomeGoogleEmail } from '@/shared/lib/email';
import { cookies, headers } from 'next/headers';
import { defaultLocale, isLocale } from '@/i18n/config';

class EmailNotVerifiedError extends AuthError {
  static type = 'EmailNotVerified';
}
class AccountDisabledError extends AuthError {
  static type = 'AccountDisabled';
}
class TooManyAttemptsError extends AuthError {
  static type = 'TooManyAttempts';
}

/** Максимальное количество записей истории входов на пользователя */
const MAX_LOGIN_HISTORY = 3;

/**
 * Проверяет, что значение является поддерживаемой ролью пользователя.
 * @param value - произвольное значение роли.
 * @returns true, если значение входит в enum Role.
 */
const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && Object.values(Role).includes(value as Role);

async function getUser(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

/**
 * Получает IP адрес из заголовков запроса.
 * @returns IP адрес или null
 */
async function getClientIp(): Promise<string | null> {
  try {
    const hdrs = await headers();
    return hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? null;
  } catch (_error: unknown) {
    return null;
  }
}

/**
 * Записывает вход пользователя в историю.
 * Хранит не более MAX_LOGIN_HISTORY записей, удаляя старые.
 * @param userId - ID пользователя
 * @param provider - провайдер авторизации
 */
async function recordLoginHistory(userId: string, provider: string): Promise<void> {
  try {
    const ip = await getClientIp();

    // Создаём новую запись
    await prisma.userLoginHistory.create({
      data: { userId, ip, provider }
    });

    // Удаляем старые записи, оставляя только последние MAX_LOGIN_HISTORY
    const allEntries = await prisma.userLoginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    });

    if (allEntries.length > MAX_LOGIN_HISTORY) {
      const idsToDelete = allEntries.slice(MAX_LOGIN_HISTORY).map((e: { id: string }) => e.id);
      await prisma.userLoginHistory.deleteMany({
        where: { id: { in: idsToDelete } }
      });
    }
  } catch (error) {
    // Не блокируем вход при ошибке записи истории
    console.error('Failed to record login history:', error);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: 'jwt' },
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true
    }),
    WebAuthn({
      relayingParty: {
        id: getRPID(),
        name: 'Vershkov App'
      }
    }),
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;

          // Rate Limit Check
          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
          const attempts = await prisma.loginAttempt.count({
            where: {
              email,
              createdAt: { gt: oneHourAgo }
            }
          });

          if (attempts >= 3) {
            throw new TooManyAttemptsError();
          }

          const user = await getUser(email);
          if (!user || !user.password) {
            // Record failed attempt
            await prisma.loginAttempt.create({ data: { email } });
            return null;
          }

          // Проверяем подтверждение email
          if (!user.emailVerified) {
            throw new EmailNotVerifiedError();
          }

          // Проверяем, не отключена ли учётная запись
          if (user.isDisabled) {
            throw new AccountDisabledError();
          }

          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) {
            // Записываем вход в историю
            await recordLoginHistory(user.id, 'credentials');
            return user;
          }

          // Record failed attempt
          await prisma.loginAttempt.create({ data: { email } });
        }
        return null;
      }
    })
  ],
  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user, trigger, session }) {
      if (user && user.role) {
        token.role = user.role;
      }

      if (
        user &&
        'language' in user &&
        typeof user.language === 'string' &&
        isLocale(user.language)
      ) {
        token.language = user.language;
      }

      if ((typeof token.language !== 'string' || !isLocale(token.language)) && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { language: true, role: true }
        });

        if (dbUser?.role && isRole(dbUser.role)) {
          token.role = dbUser.role;
        }

        token.language =
          dbUser?.language && isLocale(dbUser.language) ? dbUser.language : defaultLocale;
      }

      // Handle session update
      if (trigger === 'update' && session?.name) {
        token.name = session.name;
      }
      return token;
    },

    session({ session, token }) {
      const resolvedRole: Role = isRole(token.role) ? token.role : Role.GUEST;
      const resolvedLanguage =
        typeof token.language === 'string' && isLocale(token.language)
          ? token.language
          : defaultLocale;

      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (session.user) {
        session.user.role = resolvedRole;
      }
      if (session.user) {
        session.user.language = resolvedLanguage;
      }
      return session;
    },

    async signIn({ user, account }) {
      if (user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: {
            isDisabled: true,
            id: true,
            role: true,
            accounts: { select: { provider: true } }
          }
        });

        if (dbUser?.isDisabled) {
          return '/auth?error=AccountDisabled';
        }

        // Записываем вход для Google и WebAuthn
        if (account?.provider === 'google' || account?.provider === 'webauthn') {
          if (dbUser?.id) {
            await recordLoginHistory(dbUser.id, account.provider);
          }
        }

        if (account?.provider === 'google' && dbUser) {
          const isLinkedInDB = (dbUser.accounts as Array<{ provider: string }>).some(
            (acc: { provider: string }) => acc.provider === 'google'
          );

          // Разрешаем вход только для уже привязанного Google-аккаунта или для явного ADMIN-пользователя
          if (!isLinkedInDB && dbUser.role !== 'ADMIN') {
            return '/auth?error=UserExists';
          }
        }
      }

      return true;
    }
  },
  events: {
    /**
     * Событие createUser срабатывает при создании нового пользователя через PrismaAdapter (Google OAuth).
     * Сохраняем email как подтверждённый (Google уже верифицировал).
     */
    async createUser({ user }) {
      if (user.id) {
        let timezone = 'UTC';
        let language = defaultLocale;
        try {
          const cookieStore = await cookies();
          timezone = cookieStore.get('NEXT_TIMEZONE')?.value || 'UTC';
          const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
          language = cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
        } catch {
          // Игнорируем ошибки чтения cookies
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date(), timezone, language }
        });
      }
    },
    /**
     * Событие linkAccount срабатывает после создания аккаунта и привязки к провайдеру.
     * Отправляем welcome email при первой Google регистрации.
     */
    async linkAccount({ user, account }) {
      if (account.provider === 'google' && user.id) {
        const userAccounts = await prisma.account.findMany({
          where: { userId: user.id }
        });

        // Если у пользователя только 1 аккаунт — это первая регистрация
        if (userAccounts.length === 1) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { language: true }
          });

          const locale = dbUser?.language ?? defaultLocale;

          await sendWelcomeGoogleEmail({
            email: user.email as string,
            name: user.name ?? 'User',
            locale
          });
        }
      }
    }
  }
});
