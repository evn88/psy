import { Role } from '@prisma/client';
import type { AppLocale } from '../src/i18n/config';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      role: Role;
      language: AppLocale;
    } & DefaultSession['user'];
  }

  interface User {
    role: Role;
    language: AppLocale;
  }
}

declare module 'next-auth/adapters' {
  interface AdapterUser {
    role: Role;
    language: AppLocale;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role;
    language: AppLocale;
  }
}
