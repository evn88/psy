import { Role } from '@prisma/client';

/** Данные входа в историю логинов */
export interface LoginHistoryEntry {
  id: string;
  ip: string | null;
  provider: string;
  createdAt: Date;
}

/** Расширенный тип данных пользователя для admin-панели */
export interface AdminUserData {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  role: Role;
  isDisabled: boolean;
  language: string;
  theme: string;
  lastSeen: Date | null;
  registrationIp: string | null;
  createdAt: Date;
  updatedAt: Date;
  isOnline: boolean | null;
  fmtCreatedAt: string;
  registrationProvider: string;
  providers: string[];
  loginHistory: LoginHistoryEntry[];
}
