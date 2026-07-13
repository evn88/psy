'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  FileText,
  ClipboardCheck,
  Calendar,
  User,
  Clock,
  MessageCircle
} from 'lucide-react';
import { getIntakeAnswers } from '../_actions/intake.actions';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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
 * Переработанное модальное окно для просмотра результатов заполненной анкеты.
 * Концепция "Safe Sanctuary": структурированные блоки, пастельные тона, гармоничные иконки.
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
        <Button
          variant="outline"
          className="h-10 rounded-xl px-5 font-semibold gap-2 border-border/80 hover:bg-background transition-all"
        >
          <FileText className="h-4 w-4 text-primary" />
          {ts('viewResults')}
        </Button>
      </UI_DialogTrigger>
      <UI_DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden border-border/40 shadow-2xl rounded-2xl bg-background">
        {/* Заголовок */}
        <UI_DialogHeader className="p-6 border-b border-border/40 bg-gradient-to-br from-primary/5 via-card to-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <UI_DialogTitle className="text-xl font-bold tracking-tight">
                {t('title')}
              </UI_DialogTitle>
              <UI_DialogDescription className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-primary/70" />
                <span>
                  {ts('completedAt', {
                    date: new Date(completedAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  })}
                </span>
              </UI_DialogDescription>
            </div>
          </div>
        </UI_DialogHeader>

        {/* Контент */}
        <ScrollArea className="flex-1 p-6">
          {isPending ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-semibold text-muted-foreground animate-pulse">
                {ts('loading')}
              </p>
            </div>
          ) : data ? (
            <div className="space-y-6 pb-2">
              {/* Личные данные: Имя и Возраст */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3.5 p-4 rounded-xl border border-border/50 bg-muted/10">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      {t('fields.nameLabel')}
                    </h4>
                    <p className="text-base font-bold truncate leading-tight">{data.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-4 rounded-xl border border-border/50 bg-muted/10">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      {t('fields.ageLabel')}
                    </h4>
                    <p className="text-base font-bold leading-tight">{data.age} лет</p>
                  </div>
                </div>
              </div>

              {/* Главный запрос */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 px-1">
                  {t('fields.mainRequestLabel')}
                </h4>
                <div className="p-4 rounded-xl border border-primary/10 bg-gradient-to-br from-primary/[0.02] to-card text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {data.mainRequest}
                </div>
              </div>

              {/* Выбранные симптомы */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 px-1">
                  {t('fields.checklistLabel')}
                </h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  {data.requestChecklist?.map((id: string) => (
                    <Badge
                      key={id}
                      variant="outline"
                      className="px-3 py-1.5 text-xs font-semibold bg-primary/5 text-primary border-primary/20 hover:bg-primary/5 rounded-lg"
                    >
                      {t(`checklist.${id}`)}
                    </Badge>
                  ))}
                  {(!data.requestChecklist || data.requestChecklist.length === 0) && (
                    <p className="text-sm text-muted-foreground italic px-1">—</p>
                  )}
                </div>
              </div>

              {/* Дополнительный комментарий */}
              {data.comment && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 px-1">
                    {t('fields.commentLabel')}
                  </h4>
                  <div className="relative p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.02] text-sm leading-relaxed whitespace-pre-wrap italic text-foreground/90">
                    <MessageCircle className="absolute right-3 top-3 h-4 w-4 text-amber-500/20" />
                    {data.comment}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground font-semibold">
              Не удалось загрузить данные анкеты.
            </div>
          )}
        </ScrollArea>
      </UI_DialogContent>
    </UI_Dialog>
  );
}
