'use client';

import { useState, useTransition } from 'react';
import { Calendar, ClipboardCheck, FileText, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog as UI_Dialog,
  DialogContent as UI_DialogContent,
  DialogDescription as UI_DialogDescription,
  DialogHeader as UI_DialogHeader,
  DialogTitle as UI_DialogTitle,
  DialogTrigger as UI_DialogTrigger
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { IntakeFormSteps, IntakeQuestion } from '@/modules/intake/form-definition';
import { getIntakeAnswers } from '../_actions/intake.actions';

interface IntakeResultsModalProps {
  intakeId: string;
  completedAt: Date;
}

type IntakeResultData = {
  answers: Record<string, unknown>;
  formSnapshot: IntakeFormSteps | null;
};

const getOptionLabel = (question: IntakeQuestion, value: string) =>
  question.options.find(option => option.id === value)?.label ?? value;

const isFullWidthQuestion = (question: IntakeQuestion) =>
  question.type === 'LONG_TEXT' || question.type === 'MULTI_CHOICE';

const formatLegacyKey = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, letter => letter.toUpperCase());

/** Показывает ответы именно в той структуре, которая была опубликована при заполнении анкеты. */
export const IntakeResultsModal = ({ intakeId, completedAt }: IntakeResultsModalProps) => {
  const t = useTranslations('IntakeWizard');
  const ts = useTranslations('Surveys');
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<IntakeResultData | null>(null);

  const fetchAnswers = () => {
    startTransition(async () => {
      const result = await getIntakeAnswers(intakeId);
      if (result.success && result.answers) {
        setData({ answers: result.answers, formSnapshot: result.formSnapshot ?? null });
      }
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && !data) fetchAnswers();
  };

  return (
    <UI_Dialog open={open} onOpenChange={handleOpenChange}>
      <UI_DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-10 gap-2 rounded-xl border-border/80 px-5 font-semibold transition-all hover:bg-background"
        >
          <FileText className="size-4 text-primary" />
          {ts('viewResults')}
        </Button>
      </UI_DialogTrigger>
      <UI_DialogContent className="flex h-[85vh] max-h-[85vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/40 bg-background p-0 shadow-2xl sm:max-w-2xl">
        <UI_DialogHeader className="shrink-0 border-b border-border/40 bg-gradient-to-br from-primary/5 via-card to-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <ClipboardCheck className="size-5" />
            </div>
            <div>
              <UI_DialogTitle className="text-xl font-bold tracking-tight">
                {t('title')}
              </UI_DialogTitle>
              <UI_DialogDescription className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="size-3.5 text-primary/70" />
                {ts('completedAt', {
                  date: new Date(completedAt).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                })}
              </UI_DialogDescription>
              {data?.formSnapshot && data.formSnapshot.length > 1 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('resultsScrollHint', { count: data.formSnapshot.length })}
                </p>
              )}
            </div>
          </div>
        </UI_DialogHeader>
        <ScrollArea className="min-h-0 flex-1 p-6">
          {isPending ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="animate-pulse text-sm font-semibold text-muted-foreground">
                {ts('loading')}
              </p>
            </div>
          ) : data ? (
            <ResultContent data={data} />
          ) : (
            <div className="py-16 text-center font-semibold text-muted-foreground">
              Не удалось загрузить данные анкеты.
            </div>
          )}
        </ScrollArea>
      </UI_DialogContent>
    </UI_Dialog>
  );
};

const ResultContent = ({ data }: { data: IntakeResultData }) => {
  if (!data.formSnapshot) {
    return <LegacyResultContent answers={data.answers} />;
  }

  return (
    <div className="space-y-7 pb-2">
      {data.formSnapshot.map(step => (
        <section key={step.id} className="space-y-3">
          <div>
            <h3 className="text-base font-bold">{step.title}</h3>
            {step.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {step.questions.map(question => (
              <QuestionResult
                key={question.id}
                question={question}
                value={data.answers[question.id]}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

const QuestionResult = ({ question, value }: { question: IntakeQuestion; value: unknown }) => {
  const isEmpty =
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);

  return (
    <div className={isFullWidthQuestion(question) ? 'space-y-2 sm:col-span-2' : 'space-y-2'}>
      <h4 className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
        {question.label}
      </h4>
      <div className="rounded-xl border border-border/50 bg-muted/10 p-4 text-sm leading-relaxed">
        {isEmpty ? (
          <span className="italic text-muted-foreground">Не заполнено</span>
        ) : Array.isArray(value) ? (
          <div className="flex flex-wrap gap-2">
            {value.map(optionId => (
              <Badge
                key={String(optionId)}
                variant="outline"
                className="rounded-lg border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary"
              >
                {getOptionLabel(question, String(optionId))}
              </Badge>
            ))}
          </div>
        ) : question.type === 'SINGLE_CHOICE' && typeof value === 'string' ? (
          getOptionLabel(question, value)
        ) : (
          String(value)
        )}
      </div>
    </div>
  );
};

const LegacyResultContent = ({ answers }: { answers: Record<string, unknown> }) => (
  <div className="grid gap-4 pb-2 sm:grid-cols-2">
    {Object.entries(answers).map(([key, value]) => (
      <div key={key} className="space-y-2">
        <h4 className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
          {formatLegacyKey(key)}
        </h4>
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 text-sm leading-relaxed">
          {Array.isArray(value) ? (
            value.join(', ')
          ) : value === undefined || value === null || value === '' ? (
            <span className="italic text-muted-foreground">Не заполнено</span>
          ) : (
            String(value)
          )}
        </div>
      </div>
    ))}
  </div>
);
