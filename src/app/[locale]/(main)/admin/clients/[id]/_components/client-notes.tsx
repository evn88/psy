'use client';

import { useState, useTransition } from 'react';
import { MdxEditorWrapper } from '@/components/admin/blog/mdx-editor-wrapper';
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
      {/* Container is styled by MdxEditorWrapper internally but we give it a min-height */}
      <div className="min-h-[400px] border rounded-md">
        <MdxEditorWrapper
          value={markdown}
          onChange={setMarkdown}
          placeholder="Напишите заметки о клиенте..."
        />
      </div>
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
