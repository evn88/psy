import type { NextAuthConfig } from 'next-auth';
import type { Role } from '@prisma/client';
import { defaultLocale, isLocale } from '@/i18n/config';

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
    jwt({ token, user, trigger, session }) {
      if (user && user.role) {
        token.role = user.role;
      }

      // Handle session update
      if (trigger === 'update' && session?.name) {
        token.name = session.name;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      // token.role и token.language уже провалидированы в jwt-колбэке auth.ts
      if (session.user && typeof token.role === 'string') {
        session.user.role = token.role as Role;
      }
      if (session.user && typeof token.language === 'string' && isLocale(token.language)) {
        session.user.language = token.language;
      } else if (session.user) {
        session.user.language = defaultLocale;
      }
      return session;
    }
  }
} satisfies NextAuthConfig;
