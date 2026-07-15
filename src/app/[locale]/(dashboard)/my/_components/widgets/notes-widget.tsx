'use client';

import { useTranslations } from 'next-intl';
import { StickyNote } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';

export const NotesWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');
  const [note, setNote] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  const noteKey = `my_dashboard_notes_${data?.userId || 'guest'}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      const saved = localStorage.getItem(noteKey);
      if (saved) setNote(saved);
    }, 0);
    return () => clearTimeout(timer);
  }, [noteKey]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    localStorage.setItem(noteKey, e.target.value);
  };

  return (
    <Card
      className={cn(
        'border border-border/50 shadow-sm rounded-xl overflow-hidden h-full flex flex-col transition-all duration-300',
        !isEditing && 'pointer-events-auto'
      )}
    >
      <CardHeader className="border-b bg-muted/5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            {t('notesTitle')}
          </CardTitle>
          <StickyNote className="h-4 w-4 text-muted-foreground/60" />
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col relative">
        {isMounted ? (
          <Textarea
            value={note}
            onChange={handleChange}
            disabled={isEditing}
            placeholder={t('notesPlaceholder')}
            className="flex-1 w-full h-full min-h-[150px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-transparent p-4 text-sm leading-relaxed"
          />
        ) : (
          <div className="flex-1 w-full min-h-[150px]" />
        )}
      </CardContent>
    </Card>
  );
};
NotesWidget.defaultClassName = 'row-span-2 sm:col-span-2 lg:col-span-1';
