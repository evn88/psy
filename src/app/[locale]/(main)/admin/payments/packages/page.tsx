import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/shared/lib/prisma';
import { CreatePackageButton } from './_components/create-package-button';
import { DeletePackageButton } from './_components/delete-package-button';
import { EditPackageButton } from './_components/edit-package-button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default async function AdminPackagesPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    redirect('/admin');
  }

  const packages = await prisma.servicePackage.findMany({
    orderBy: { order: 'asc' }
  });

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Пакеты услуг</h1>
          <p className="text-sm text-muted-foreground mt-1">{packages.length} пакетов</p>
        </div>
        <div className="flex items-center gap-2">
          <CreatePackageButton />
        </div>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg mb-4">Пакетов пока нет</p>
          <CreatePackageButton />
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg: any) => {
            const titleObj = pkg.title as Record<string, string>;
            const title = titleObj?.ru || titleObj?.en || 'Без названия';

            return (
              <div
                key={pkg.id}
                className="flex items-center gap-4 p-4 bg-card border rounded-xl hover:shadow-sm transition-shadow"
              >
                {pkg.coverImage && (
                  <Image
                    src={pkg.coverImage}
                    alt={title}
                    width={64}
                    height={64}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                )}
                {!pkg.coverImage && (
                  <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                    Нет фото
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-foreground truncate">{title}</span>
                    <Badge
                      variant={pkg.isActive ? 'default' : 'secondary'}
                      className={
                        pkg.isActive
                          ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'
                      }
                    >
                      {pkg.isActive ? 'Активен' : 'Скрыт'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>
                      Цена: {pkg.amount.toString()} {pkg.currency}
                    </span>
                    <span>Позиция: {pkg.order}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <EditPackageButton pkg={JSON.parse(JSON.stringify(pkg))} />
                  <DeletePackageButton packageId={pkg.id} title={title} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
