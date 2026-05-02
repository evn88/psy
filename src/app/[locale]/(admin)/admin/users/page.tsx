import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateUserDialog } from './_components/CreateUserDialog';
import { AdminUserList } from './_components/AdminUserList';

export default async function AdminPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      sessions: {
        orderBy: { expires: 'desc' },
        take: 1
      },
      accounts: {
        select: {
          provider: true,
          createdAt: true
        }
      }
    }
  });

  // Загружаем loginHistory отдельно для группировки по userId
  const loginHistoryMap = new Map<
    string,
    { id: string; ip: string | null; provider: string; createdAt: Date }[]
  >();
  const allHistory = await prisma.userLoginHistory.findMany({
    orderBy: { createdAt: 'desc' }
  });
  for (const entry of allHistory) {
    const existing = loginHistoryMap.get(entry.userId) ?? [];
    if (existing.length < 3) {
      existing.push({
        id: entry.id,
        ip: entry.ip,
        provider: entry.provider,
        createdAt: entry.createdAt
      });
      loginHistoryMap.set(entry.userId, existing);
    }
  }

  // eslint-disable-next-line react-hooks/purity -- Server Component: вычисляется однократно на сервере
  const now = Date.now();
  const OFFLINE_THRESHOLD = 5 * 60 * 1000;

  const formattedUsers = users.map((user: (typeof users)[number]) => {
    const isOnline = user.lastSeen && now - new Date(user.lastSeen).getTime() < OFFLINE_THRESHOLD;

    // Определяем провайдер регистрации
    const providers = user.accounts.map((acc: (typeof user.accounts)[number]) => acc.provider);
    const hasPassword = Boolean(user.password);
    const registrationProvider = providers.includes('google')
      ? 'google'
      : hasPassword
        ? 'credentials'
        : 'unknown';

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      isDisabled: user.isDisabled,
      language: user.language,
      theme: user.theme,
      timezone: user.timezone ?? null,
      lastSeen: user.lastSeen,
      registrationIp: user.registrationIp ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isOnline,
      fmtCreatedAt: new Date(user.createdAt).toLocaleDateString('ru-RU'),
      registrationProvider,
      providers,
      loginHistory: loginHistoryMap.get(user.id) ?? []
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
