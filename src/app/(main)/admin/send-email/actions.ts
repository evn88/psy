import prisma from '@/shared/lib/prisma';
import { auth } from '@/auth';

export type EmailUser = {
  id: string;
  name: string | null;
  email: string | null;
};

export async function getUsersForEmail(): Promise<EmailUser[]> {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return users;
  } catch (error) {
    console.error('Failed to fetch users for email:', error);
    return [];
  }
}
