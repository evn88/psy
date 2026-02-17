'use server';

import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';

export async function updateUserHeartbeat() {
  const session = await auth();

  if (!session?.user?.email) {
    return;
  }

  try {
    await prisma.user.update({
      where: { email: session.user.email },
      data: { lastSeen: new Date() }
    });
  } catch (error) {
    console.error('Failed to update heartbeat:', error);
    // Silent fail is okay for heartbeat
  }
}
