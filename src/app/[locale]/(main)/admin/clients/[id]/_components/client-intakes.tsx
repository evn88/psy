'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle2 } from 'lucide-react';

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
              <AccordionTrigger className="hover:no-underline hover:bg-muted/30 px-6 py-4 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-left w-full pr-4">
                  <div className="font-semibold flex items-center gap-2">
                    Анкета #{intakes.length - idx}
                    {intake.status === 'COMPLETED' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground font-normal sm:ml-auto">
                    {new Date(intake.createdAt).toLocaleString('ru-RU')}{' '}
                    <span className="opacity-50 mx-1">|</span> v:{' '}
                    {intake.formId.replace('intake_', '')}
                  </div>
                </div>
              </AccordionTrigger>
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
