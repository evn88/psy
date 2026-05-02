import { NextResponse } from 'next/server';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/events/pending
 * Возвращает список будущих запросов на подтверждение для боковой панели админа.
 */
async function getHandler() {
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

export const GET = withApiLogging(getHandler);
