import { Prisma } from '@prisma/client';
import prisma from '@/shared/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateUserDialog } from './_components/create-user-dialog';
import { AdminUserList } from './_components/admin-user-list';

type UserWithSessions = Prisma.UserGetPayload<{
  include: { sessions: true };
}>;

export default async function AdminPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      sessions: {
        orderBy: { expires: 'desc' },
        take: 1
      }
    }
  });

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const OFFLINE_THRESHOLD = 5 * 60 * 1000;

  const formattedUsers = users.map((user: UserWithSessions) => {
    const lastSession = user.sessions[0];

    // 5 minutes threshold for online status
    const isOnline = user.lastSeen && now - new Date(user.lastSeen).getTime() < OFFLINE_THRESHOLD;

    return {
      ...user,
      isOnline,
      fmtCreatedAt: new Date(user.createdAt).toLocaleDateString('ru-RU')
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <CreateUserDialog />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminUserList users={formattedUsers} />
        </CardContent>
      </Card>
    </div>
  );
}
