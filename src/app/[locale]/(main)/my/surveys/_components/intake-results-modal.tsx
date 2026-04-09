'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, ClipboardCheck, Calendar } from 'lucide-react';
import { getIntakeAnswers } from '../_actions/intake.actions';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Динамический импорт диалога так как мы используем его компоненты
import {
  Dialog as UI_Dialog,
  DialogContent as UI_DialogContent,
  DialogDescription as UI_DialogDescription,
  DialogHeader as UI_DialogHeader,
  DialogTitle as UI_DialogTitle,
  DialogTrigger as UI_DialogTrigger
} from '@/components/ui/dialog';

interface IntakeResultsModalProps {
  intakeId: string;
  completedAt: Date;
}

/**
 * Модальное окно для просмотра результатов уже заполненной анкеты.
 * Загружает и расшифровывает данные при открытии.
 */
export function IntakeResultsModal({ intakeId, completedAt }: IntakeResultsModalProps) {
  const t = useTranslations('IntakeWizard');
  const ts = useTranslations('Surveys');
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<any>(null);

  const fetchAnswers = () => {
    startTransition(async () => {
      const res = await getIntakeAnswers(intakeId);
      if (res.success) {
        setData(res.answers);
      }
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !data) {
      fetchAnswers();
    }
  };

  return (
    <UI_Dialog open={open} onOpenChange={handleOpenChange}>
      <UI_DialogTrigger asChild>
        <Button variant="outline" className="gap-2 focus-visible:ring-primary">
          <FileText className="h-4 w-4" />
          {ts('viewResults')}
        </Button>
      </UI_DialogTrigger>
      <UI_DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <UI_DialogHeader className="p-6 border-b bg-muted/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <UI_DialogTitle className="text-xl">{t('title')}</UI_DialogTitle>
          </div>
          <UI_DialogDescription className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {ts('completedAt', {
              date: new Date(completedAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            })}
          </UI_DialogDescription>
        </UI_DialogHeader>

        <ScrollArea className="flex-1 p-6">
          {isPending ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">{ts('loading')}</p>
            </div>
          ) : data ? (
            <div className="space-y-8 pb-4">
              <div className="grid grid-cols-2 gap-6">
                <section className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    {t('fields.nameLabel')}
                  </h4>
                  <p className="text-lg font-medium">{data.name}</p>
                </section>
                <section className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    {t('fields.ageLabel')}
                  </h4>
                  <p className="text-lg font-medium">{data.age}</p>
                </section>
              </div>

              <section className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                  {t('fields.mainRequestLabel')}
                </h4>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-sm leading-relaxed whitespace-pre-wrap">
                  {data.mainRequest}
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                  {t('fields.checklistLabel')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.requestChecklist?.map((id: string) => (
                    <Badge
                      key={id}
                      variant="outline"
                      className="px-3 py-1 text-xs font-normal bg-muted/50 border-border/50"
                    >
                      {t(`checklist.${id}`)}
                    </Badge>
                  ))}
                  {(!data.requestChecklist || data.requestChecklist.length === 0) && (
                    <p className="text-sm text-muted-foreground italic">—</p>
                  )}
                </div>
              </section>

              {data.comment && (
                <section className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    {t('fields.commentLabel')}
                  </h4>
                  <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 text-sm leading-relaxed whitespace-pre-wrap italic">
                    {data.comment}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              Ошибка при загрузке данных
            </div>
          )}
        </ScrollArea>
      </UI_DialogContent>
    </UI_Dialog>
  );
}
