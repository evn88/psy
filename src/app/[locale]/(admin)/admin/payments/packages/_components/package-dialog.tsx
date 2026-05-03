'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Image from 'next/image';
import { useRouter } from '@/i18n/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const packageSchema = z.object({
  titleRu: z.string().min(1, 'Обязательное поле'),
  titleEn: z.string().optional(),
  titleSr: z.string().optional(),
  descriptionRu: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionSr: z.string().optional(),
  amount: z
    .number({ message: 'Сумма должна быть больше 0' })
    .min(0.01, 'Сумма должна быть больше 0'),
  currency: z.string(),
  isActive: z.boolean(),
  order: z.number({ message: 'Введите число' }),
  coverImage: z.string().optional()
});

type PackageFormValues = z.infer<typeof packageSchema>;

interface PackageDialogProps {
  children: React.ReactNode;
  pkg?: any; // The initial package data if editing
  onSuccess?: () => void;
}

export function PackageDialog({ children, pkg, onSuccess }: PackageDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!pkg;

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      titleRu: pkg?.title?.ru || '',
      titleEn: pkg?.title?.en || '',
      titleSr: pkg?.title?.sr || '',
      descriptionRu: pkg?.description?.ru || '',
      descriptionEn: pkg?.description?.en || '',
      descriptionSr: pkg?.description?.sr || '',
      amount: pkg?.amount ? parseFloat(pkg.amount) : 50,
      currency: pkg?.currency || 'EUR',
      isActive: pkg?.isActive ?? true,
      order: pkg?.order ?? 0,
      coverImage: pkg?.coverImage || ''
    }
  });

  const onSubmit = async (values: PackageFormValues) => {
    setLoading(true);
    try {
      const payload = {
        title: {
          ru: values.titleRu,
          ...(values.titleEn ? { en: values.titleEn } : {}),
          ...(values.titleSr ? { sr: values.titleSr } : {})
        },
        description: {
          ru: values.descriptionRu,
          ...(values.descriptionEn ? { en: values.descriptionEn } : {}),
          ...(values.descriptionSr ? { sr: values.descriptionSr } : {})
        },
        amount: values.amount,
        currency: values.currency,
        isActive: values.isActive,
        order: values.order,
        coverImage: values.coverImage || null
      };

      const url = isEditing
        ? `/api/admin/payments/packages/${pkg.id}`
        : '/api/admin/payments/packages';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Ошибка сохранения');

      toast.success(isEditing ? 'Пакет обновлен' : 'Пакет создан');
      setOpen(false);
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error('Произошла ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимум 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const uploadToast = toast.loading('Загрузка изображения...');
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Ошибка при загрузке');
      }

      const data = await response.json();
      form.setValue('coverImage', data.url);
      toast.success('Изображение загружено', { id: uploadToast });
    } catch (error) {
      toast.error('Не удалось загрузить изображение', { id: uploadToast });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Редактировать пакет' : 'Создать пакет'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h3 className="font-medium">Названия</h3>
                <FormField
                  control={form.control}
                  name="titleRu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название (RU)</FormLabel>
                      <FormControl>
                        <Input placeholder="Разовая сессия" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="titleEn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название (EN)</FormLabel>
                      <FormControl>
                        <Input placeholder="Single Session" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="titleSr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название (SR)</FormLabel>
                      <FormControl>
                        <Input placeholder="Jedna Sesija" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Описание</h3>
                <FormField
                  control={form.control}
                  name="descriptionRu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Описание (RU)</FormLabel>
                      <FormControl>
                        <Input placeholder="Краткое описание" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="descriptionEn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Описание (EN)</FormLabel>
                      <FormControl>
                        <Input placeholder="Short description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="descriptionSr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Описание (SR)</FormLabel>
                      <FormControl>
                        <Input placeholder="Kratak opis" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          field.onChange(isNaN(val) ? undefined : val);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Валюта</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сортировка</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10);
                          field.onChange(isNaN(val) ? undefined : val);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Активен</FormLabel>
                    <p className="text-sm text-muted-foreground">Показывать пакет клиентам</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="font-medium">Обложка</h3>
              <div className="flex items-center gap-4">
                {form.watch('coverImage') ? (
                  <Image
                    src={form.watch('coverImage') ?? ''}
                    alt="Cover"
                    width={96}
                    height={96}
                    className="w-24 h-24 object-cover border rounded-md"
                  />
                ) : null}
                <Input type="file" accept="image/*" onChange={handleImageUpload} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#900A0B] hover:bg-[#900A0B]/90 text-white"
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
