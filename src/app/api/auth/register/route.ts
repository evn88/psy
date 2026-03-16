import { NextResponse } from 'next/server';
import prisma from '@/shared/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { headers } from 'next/headers';
import { sendVerificationEmail } from '@/shared/lib/email';

/** Время жизни токена верификации — 24 часа */
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  locale: z.string().optional().default('en'),
  timezone: z.string().optional().default('UTC')
});

/**
 * POST /api/auth/register
 * Регистрирует нового пользователя, сохраняет locale из фронтенда,
 * генерирует verification token и отправляет email для подтверждения.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ message: result.error.issues[0].message }, { status: 400 });
    }

    const { name, email, password, locale, timezone } = result.data;

    // Проверяем существование пользователя
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
    }

    // Получаем IP из заголовков
    const hdrs = await headers();
    const registrationIp =
      hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? null;

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаём пользователя с locale, timezone и IP из фронтенда
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        language: locale,
        timezone,
        registrationIp,
        role: email === 'evn88fx64@gmail.com' ? 'ADMIN' : 'GUEST'
      }
    });

    // Генерируем verification token
    const token = randomUUID();
    const expires = new Date();
    expires.setHours(expires.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires
      }
    });

    // Отправляем verification email на языке пользователя
    await sendVerificationEmail({
      email,
      name,
      token,
      locale
    });

    return NextResponse.json({ needsVerification: true }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'An error occurred while registering the user' },
      { status: 500 }
    );
  }
}
