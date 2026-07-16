'use client';

import { useTranslations } from 'next-intl';
import { StickyNote } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { DashboardWidget, DashboardWidgetHeader } from '@/components/dashboard/dashboard-widget';

export const AdminNotesWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('Admin');
  const [note, setNote] = useState('');
  const [loadedNoteKey, setLoadedNoteKey] = useState<string | null>(null);

  const noteKey = data?.userId ? `admin_dashboard_notes_${data.userId}` : null;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!noteKey) return;

      setNote(localStorage.getItem(noteKey) ?? '');
      setLoadedNoteKey(noteKey);
    }, 0);
    return () => clearTimeout(timer);
  }, [noteKey]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!noteKey) return;

    setNote(e.target.value);
    localStorage.setItem(noteKey, e.target.value);
  };

  return (
    <DashboardWidget>
      <DashboardWidgetHeader title={t('notesTitle')} icon={StickyNote} />
      <CardContent className="p-0 flex-1 flex flex-col relative">
        {noteKey && loadedNoteKey === noteKey ? (
          <Textarea
            value={note}
            onChange={handleChange}
            disabled={isEditing}
            placeholder={t('notesPlaceholder')}
            className="min-h-44 flex-1 resize-none rounded-none border-0 bg-transparent p-5 text-sm leading-6 focus-visible:ring-2 focus-visible:ring-inset"
          />
        ) : (
          <div className="flex-1 w-full min-h-[150px]" />
        )}
      </CardContent>
    </DashboardWidget>
  );
};
AdminNotesWidget.defaultClassName = 'row-span-2 sm:col-span-2 lg:col-span-1';
