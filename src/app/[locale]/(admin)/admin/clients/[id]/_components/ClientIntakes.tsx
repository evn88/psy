'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { deleteIntakeResponse } from '../../_actions/clients.actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/AlertDialog';

interface PlainIntake {
  id: string;
  formId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  plainAnswers: Record<string, any>;
}

const KEY_LABELS: Record<string, string> = {
  name: 'Имя',
  age: 'Возраст',
  mainRequest: 'Основной запрос',
  requestChecklist: 'Отмеченные проблемы',
  comment: 'Дополнительный комментарий'
};

const FULL_WIDTH_KEYS = ['mainRequest', 'comment', 'requestChecklist'];

function renderAnswer(key: string, value: any, tWizard: (key: string) => string) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground italic font-normal text-sm">Не заполнено</span>;
  }

  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет';
  }

  if (Array.isArray(value)) {
    if (value.length === 0)
      return <span className="text-muted-foreground italic font-normal text-sm">Не выбрано</span>;
    return (
      <div className="flex flex-wrap gap-2 mt-1">
        {value.map((v, i) => {
          let label = String(v);
          if (key === 'requestChecklist') {
            try {
              label = tWizard(`checklist.${v}`);
            } catch (e) {
              label = String(v);
            }
          }
          return (
            <span
              key={i}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
            >
              {label}
            </span>
          );
        })}
      </div>
    );
  }

  if (typeof value === 'object') {
    return (
      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto border">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (typeof value === 'string') {
    return <p className="whitespace-pre-wrap leading-relaxed">{value}</p>;
  }

  return String(value);
}

import { useTranslations } from 'next-intl';

export function ClientIntakes({ intakes }: { intakes: PlainIntake[] }) {
  const t = useTranslations('Admin.clients.dashboard');
  const tWizard = useTranslations('IntakeWizard');

  if (!intakes || intakes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t('intakes.title')}</CardTitle>
          <CardDescription>{t('intakes.empty')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="bg-muted/20 border-b pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {t('intakes.title')}
        </CardTitle>
        <CardDescription>{t('intakes.description')}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="w-full">
          {intakes.map((intake, idx) => (
            <AccordionItem key={intake.id} value={intake.id} className="border-b last:border-0">
              <div className="relative group">
                <AccordionTrigger className="hover:no-underline hover:bg-muted/30 px-6 py-4 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-left w-full pr-14">
                    <div className="font-semibold flex items-center gap-2">
                      Анкета #{intakes.length - idx}
                      {intake.status === 'COMPLETED' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground font-normal sm:ml-auto flex items-center gap-4">
                      <div className="hidden sm:block">
                        {new Date(intake.createdAt).toLocaleString('ru-RU')}{' '}
                        <span className="opacity-50 mx-1">|</span> v:{' '}
                        {intake.formId.replace('intake_', '')}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <div className="absolute right-12 top-0 bottom-0 z-10 flex items-center">
                  <IntakeDeleteButton intakeId={intake.id} />
                </div>
              </div>
              <AccordionContent className="px-6 py-4 bg-muted/10 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                  {Object.entries(intake.plainAnswers).map(([key, value]) => {
                    const isFullWidth = FULL_WIDTH_KEYS.includes(key);
                    const label =
                      KEY_LABELS[key] ||
                      key
                        .replace(/([A-Z])/g, ' $1')
                        .trim()
                        .toUpperCase();

                    return (
                      <div
                        key={key}
                        className={`space-y-1.5 ${isFullWidth ? 'md:col-span-2' : ''}`}
                      >
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {label}
                        </h4>
                        <div className="text-sm">{renderAnswer(key, value, tWizard as any)}</div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

function IntakeDeleteButton({ intakeId }: { intakeId: string }) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('Admin.clients.dashboard.intakes');

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteIntakeResponse(intakeId);
      if (result.success) {
        toast.success(t('deleteSuccess') || 'Анкета удалена');
      } else {
        toast.error(result.error || 'Ошибка удаления');
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          onClick={e => e.stopPropagation()}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={e => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('deleteConfirmDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={e => e.stopPropagation()}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={e => {
              e.stopPropagation();
              handleDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
          >
            {isPending ? t('deleting') : t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
