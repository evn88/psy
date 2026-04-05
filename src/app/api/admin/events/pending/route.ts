import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';

/**
 * GET /api/admin/events/pending
 * Возвращает список будущих запросов на подтверждение для боковой панели админа.
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const pendingRequests = await prisma.event.findMany({
      where: {
        status: 'PENDING_CONFIRMATION',
        end: {
          gte: new Date()
        },
        userId: {
          not: null
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        start: 'asc'
      }
    });

    return NextResponse.json(pendingRequests);
  } catch (error) {
    console.error('Failed to fetch pending approval requests:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
