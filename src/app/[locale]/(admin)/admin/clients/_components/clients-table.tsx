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
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Trash2, CalendarCheck, Users } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { deleteClientUser, assignClientToGroup } from '../_actions/clients.actions';
import { toast } from 'sonner';

interface ClientItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  intakesCount: number;
  fmtCreatedAt: string;
  clientGroupId: string | null;
  clientGroup: { id: string; name: string; color: string | null } | null;
}

interface GroupItem {
  id: string;
  name: string;
  color: string | null;
}

export function ClientsTable({ clients, groups }: { clients: ClientItem[]; groups: GroupItem[] }) {
  const t = useTranslations('Admin.clients.table');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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

  const handleAssignGroup = (userId: string, groupId: string | null) => {
    startTransition(async () => {
      const res = await assignClientToGroup(userId, groupId);
      if (res.success) {
        toast.success('Группа изменена');
        router.refresh();
      } else {
        toast.error(res.error || 'Ошибка при изменении группы');
      }
    });
  };

  const filteredClients = clients.filter(c => {
    if (!selectedGroupId) return true;
    if (selectedGroupId === 'none') return !c.clientGroupId;
    return c.clientGroupId === selectedGroupId;
  });

  return (
    <div className="rounded-md border">
      <div className="p-4 border-b bg-muted/20 flex gap-2 overflow-x-auto">
        <Badge
          variant={selectedGroupId === null ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedGroupId(null)}
        >
          Все
        </Badge>
        <Badge
          variant={selectedGroupId === 'none' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedGroupId('none')}
        >
          Без группы
        </Badge>
        {groups.map(g => (
          <Badge
            key={g.id}
            variant={selectedGroupId === g.id ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedGroupId(g.id)}
            style={{
              borderColor: g.color || undefined,
              backgroundColor: selectedGroupId === g.id ? g.color || undefined : undefined
            }}
          >
            {g.name}
          </Badge>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>{t('name')}</TableHead>
            <TableHead>{t('email')}</TableHead>
            <TableHead>Группа</TableHead>
            <TableHead className="text-center">{t('intakesCount')}</TableHead>
            <TableHead>{t('registeredAt')}</TableHead>
            <TableHead className="text-right">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                Нет данных
              </TableCell>
            </TableRow>
          ) : (
            filteredClients.map(client => (
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
                <TableCell>
                  {client.clientGroup ? (
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: client.clientGroup.color || undefined,
                        color: client.clientGroup.color || undefined
                      }}
                    >
                      {client.clientGroup.name}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Нет</span>
                  )}
                </TableCell>
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

                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Users className="mr-2 h-4 w-4" />
                          Группа
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuRadioGroup
                            value={client.clientGroupId || 'none'}
                            onValueChange={val =>
                              handleAssignGroup(client.id, val === 'none' ? null : val)
                            }
                          >
                            <DropdownMenuRadioItem value="none">Без группы</DropdownMenuRadioItem>
                            {groups.map(g => (
                              <DropdownMenuRadioItem key={g.id} value={g.id}>
                                {g.name}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

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
