'use client';

import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { Role } from '@prisma/client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { updateUser } from '../actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

const formSchema = z.object({
  id: z.string(),
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.'
  }),
  email: z.string().email(),
  role: z.nativeEnum(Role),
  password: z
    .string()
    .min(6, {
      message: 'Password must be at least 6 characters.'
    })
    .optional()
    .or(z.literal(''))
});

interface EditUserDialogProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Диалог редактирования пользователя.
 * Использует next-intl для интернационализации.
 */
export const EditUserDialog = ({ user, open, onOpenChange }: EditUserDialogProps) => {
  const t = useTranslations('Admin');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: user.id,
      name: user.name || '',
      email: user.email,
      role: user.role,
      password: ''
    }
  });

  /**
   * Отправляет форму редактирования пользователя.
   * @param values - данные формы
   */
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    const result = await updateUser(values);
    setLoading(false);

    if (result.success) {
      onOpenChange(false);
      router.refresh();
    } else {
      console.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('editUserTitle')}</DialogTitle>
          <DialogDescription>{t('editUserDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('nameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('emailLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('passwordLabel')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Leave empty to keep current" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('roleLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectRole')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={Role.ADMIN}>{t('roleAdmin')}</SelectItem>
                      <SelectItem value={Role.USER}>{t('roleUser')}</SelectItem>
                      <SelectItem value={Role.GUEST}>{t('roleGuest')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? t('saving') : t('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
