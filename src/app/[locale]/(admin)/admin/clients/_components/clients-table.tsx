'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Trash2, CalendarCheck } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { deleteClientUser } from '../_actions/clients.actions';
import { toast } from 'sonner';

interface ClientItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  intakesCount: number;
  fmtCreatedAt: string;
}

export function ClientsTable({ clients }: { clients: ClientItem[] }) {
  const t = useTranslations('Admin.clients.table');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = (id: string, name: string | null) => {
    if (
      !confirm(`Вы действительно хотите безвозвратно удалить пользователя ${name || 'Без имени'}?`)
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteClientUser(id);
      if (res.success) {
        toast.success('Пользователь удален');
        router.refresh();
      } else {
        toast.error(res.error || 'Ошибка при удалении');
      }
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>{t('name')}</TableHead>
            <TableHead>{t('email')}</TableHead>
            <TableHead className="text-center">{t('intakesCount')}</TableHead>
            <TableHead>{t('registeredAt')}</TableHead>
            <TableHead className="text-right">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                Нет данных
              </TableCell>
            </TableRow>
          ) : (
            clients.map(client => (
              <TableRow key={client.id}>
                <TableCell>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={client.image || ''} />
                    <AvatarFallback>{client.name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-semibold cursor-pointer">
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="hover:underline text-primary"
                  >
                    {client.name || 'Без имени'}
                  </Link>
                </TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell className="text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${client.intakesCount > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                  >
                    {client.intakesCount}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{client.fmtCreatedAt}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {/* TODO: Implement real schedule logic later */}
                      <DropdownMenuItem
                        onClick={() => toast.info('Будет реализовано в модуле расписания')}
                      >
                        <CalendarCheck className="mr-2 h-4 w-4" />
                        {t('schedule')}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(client.id, client.name)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
