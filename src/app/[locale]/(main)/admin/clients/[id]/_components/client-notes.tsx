'use client';

import { useState, useTransition } from 'react';
import { ForwardRefEditor } from '@/shared/ui/mdx-editor';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateClientNotes } from '../../_actions/clients.actions';
import { useTranslations } from 'next-intl';

export function ClientNotes({
  userId,
  initialMarkdown
}: {
  userId: string;
  initialMarkdown: string;
}) {
  const t = useTranslations('Admin.clients.dashboard');
  const [markdown, setMarkdown] = useState(initialMarkdown || '');
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateClientNotes(userId, markdown);
      if (res.success) {
        toast.success(t('notes.saved'));
      } else {
        toast.error(res.error || 'Ошибка при сохранении заметок');
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* ForwardRefEditor содержит dynamic(ssr:false) внутри — лишний dynamic() здесь не нужен */}
      <ForwardRefEditor
        value={markdown}
        onChange={setMarkdown}
        placeholder="Напишите заметки о клиенте..."
      />
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t('notes.save')}
        </Button>
      </div>
    </div>
  );
}
