'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Создаёт новый черновик статьи и переводит пользователя в редактор.
 *
 * @returns Кнопку создания статьи.
 */
export function CreateArticleButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Новая статья' })
      });
      if (!res.ok) throw new Error('Ошибка создания');
      const data = await res.json();
      router.push(`/admin/blog/${data.id}`);
    } catch {
      toast.error('Не удалось создать статью');
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCreate}
      disabled={loading}
      className="bg-[#900A0B] hover:bg-[#900A0B]/90 text-white"
    >
      <Plus className="size-4 mr-1.5" />
      {loading ? 'Создаю...' : 'Создать статью'}
    </Button>
  );
}
