import type { NextAuthConfig } from 'next-auth';
import { Role } from '@prisma/client';
import prisma from '@/shared/lib/prisma';
import { defaultLocale, isLocale } from '@/i18n/config';

/**
 * Проверяет, что значение является поддерживаемой ролью пользователя.
 * @param value - произвольное значение роли.
 * @returns true, если значение входит в enum Role.
 */
const isRole = (value: unknown): value is Role => {
  return typeof value === 'string' && Object.values(Role).includes(value as Role);
};

export const authConfig = {
  pages: {
    signIn: '/auth'
  },
  experimental: {
    enableWebAuthn: true
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // We can allow the middleware to handle the redirection logic largely,
      // or put it here. For now, let's keep simple true/false here or
      // let the middleware use its own logic on the session.
      // Returning true means "let the request pass" (or let middleware handle it).
      return true;
    },
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
    }
  }
} satisfies NextAuthConfig;
