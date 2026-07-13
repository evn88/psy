import prisma from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientsTable } from './_components/clients-table';
import { ClientGroupsTable } from './_components/client-groups-table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function AdminClientsPage() {
  const t = await getTranslations('Admin.clients');

  // We want all users but mainly observing if they have intakes. We exclude GUESTs.
  const users = await prisma.user.findMany({
    where: { role: { not: 'GUEST' } },
    orderBy: { createdAt: 'desc' },
    include: {
      clientGroup: true,
      clientProfile: {
        include: {
          _count: {
            select: { intakes: true }
          }
        }
      }
    }
  });

  const groups = await prisma.clientGroup.findMany({
    orderBy: { name: 'asc' }
  });

  const formattedClients = users.map((u: (typeof users)[number]) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    intakesCount: u.clientProfile?._count?.intakes || 0,
    clientGroupId: u.clientGroupId,
    clientGroup: u.clientGroup,
    fmtCreatedAt: new Date(u.createdAt).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="clients">Список клиентов</TabsTrigger>
          <TabsTrigger value="groups">Группы клиентов</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex h-10 items-center">
                <CardTitle>Список клиентов</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ClientsTable clients={formattedClients} groups={groups} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <ClientGroupsTable groups={groups} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
