import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import prisma from '@/shared/lib/prisma';
import { Users, Activity } from 'lucide-react';

async function getStats() {
  const userCount = await prisma.user.count();

  // Count active sessions as a proxy for online users
  // Count active sessions as a proxy for online users
  const OFFLINE_THRESHOLD = 5 * 60 * 1000;
  const activeThreshold = new Date(Date.now() - OFFLINE_THRESHOLD);

  const activeSessionsCount = await prisma.user.count({
    where: {
      lastSeen: {
        gt: activeThreshold
      }
    }
  });

  return {
    userCount,
    activeSessionsCount
  };
}

export default async function AdminDashboardPage() {
  const { userCount, activeSessionsCount } = await getStats();

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
            <p className="text-xs text-muted-foreground">Registered users on the platform</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Now</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessionsCount}</div>
            <p className="text-xs text-muted-foreground">Active sessions currently valid</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
