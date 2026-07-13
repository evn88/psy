'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  createClientGroup,
  updateClientGroup,
  deleteClientGroup
} from '../_actions/clients.actions';

interface ClientGroup {
  id: string;
  name: string;
  color: string | null;
}

const groupSchema = z.object({
  name: z.string().min(1, 'Обязательно'),
  color: z.string().nullable()
});

type GroupFormValues = z.infer<typeof groupSchema>;

export function ClientGroupsTable({ groups }: { groups: ClientGroup[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<ClientGroup | null>(null);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      color: '#3b82f6'
    }
  });

  const openAddDialog = () => {
    form.reset({ name: '', color: '#3b82f6' });
    setEditingGroup(null);
    setDialogOpen(true);
  };

  const openEditDialog = (group: ClientGroup) => {
    form.reset({
      name: group.name,
      color: group.color || '#3b82f6'
    });
    setEditingGroup(group);
    setDialogOpen(true);
  };

  const onSubmit = (data: GroupFormValues) => {
    startTransition(async () => {
      try {
        if (editingGroup) {
          const res = await updateClientGroup(editingGroup.id, data.name, data.color);
          if (res.success) {
            toast.success('Группа обновлена');
            setDialogOpen(false);
            router.refresh();
          } else {
            toast.error('Ошибка при обновлении группы');
          }
        } else {
          const res = await createClientGroup(data.name, data.color);
          if (res.success) {
            toast.success('Группа создана');
            setDialogOpen(false);
            router.refresh();
          } else {
            toast.error('Ошибка при создании группы');
          }
        }
      } catch (err) {
        toast.error('Произошла непредвиденная ошибка');
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Удалить эту группу? Клиенты, находящиеся в ней, останутся без группы.')) return;

    startTransition(async () => {
      const res = await deleteClientGroup(id);
      if (res.success) {
        toast.success('Группа удалена');
        router.refresh();
      } else {
        toast.error('Ошибка при удалении группы');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Управление группами</h3>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" /> Создать группу
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Цвет</TableHead>
              <TableHead>Название группы</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Нет созданных групп.
                </TableCell>
              </TableRow>
            ) : (
              groups.map(group => (
                <TableRow key={group.id}>
                  <TableCell>
                    {group.color && (
                      <div
                        className="w-4 h-4 rounded-full border border-border shadow-sm"
                        style={{ backgroundColor: group.color }}
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(group)}
                        disabled={isPending}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(group.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Редактировать группу' : 'Создать группу'}</DialogTitle>
            <DialogDescription>
              Задайте название и цвет для классификации клиентов.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название группы</FormLabel>
                    <FormControl>
                      <Input placeholder="Например: VIP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цвет (HEX)</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          className="w-12 p-1 h-10"
                          {...field}
                          value={field.value || '#000000'}
                        />
                        <Input
                          type="text"
                          placeholder="#3b82f6"
                          {...field}
                          value={field.value || ''}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isPending}
                >
                  Отмена
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
