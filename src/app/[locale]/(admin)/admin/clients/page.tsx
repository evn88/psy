import prisma from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientsTable } from './_components/ClientsTable';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default async function AdminClientsPage() {
  const t = await getTranslations('Admin.clients');

  // We want all users but mainly observing if they have intakes.
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      clientProfile: {
        include: {
          _count: {
            select: { intakes: true }
          }
        }
      }
    }
  });

  const formattedClients = users.map((u: (typeof users)[number]) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    intakesCount: u.clientProfile?._count?.intakes || 0,
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

      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle>{t('table.intakesCount')}</CardTitle>
            {/* Simple visual search placeholder, actual client-side filtering can be added to clients-table if needed */}
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('table.searchPlaceholder')}
                className="pl-9 h-9"
                disabled
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ClientsTable clients={formattedClients} />
        </CardContent>
      </Card>
    </div>
  );
}
