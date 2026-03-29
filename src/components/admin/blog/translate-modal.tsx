'use client';

import { useState } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface TranslateModalProps {
  postId: string;
  open: boolean;
  onClose: () => void;
  existingLocales: string[];
  onTranslated: (
    locale: string,
    data: { title: string; description: string; content: string }
  ) => void;
}

const AVAILABLE_LOCALES = [
  { locale: 'en', label: 'English' },
  { locale: 'sr', label: 'Srpski (Сербский)' }
];

type TranslateStatus = 'idle' | 'loading' | 'success' | 'error';

export function TranslateModal({
  postId,
  open,
  onClose,
  existingLocales,
  onTranslated
}: TranslateModalProps) {
  const [selected, setSelected] = useState<string[]>(
    AVAILABLE_LOCALES.filter(l => !existingLocales.includes(l.locale)).map(l => l.locale)
  );
  const [statuses, setStatuses] = useState<Record<string, TranslateStatus>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  const toggleLocale = (locale: string) => {
    setSelected(prev =>
      prev.includes(locale) ? prev.filter(l => l !== locale) : [...prev, locale]
    );
  };

  const handleTranslate = async () => {
    if (selected.length === 0) return;
    setIsTranslating(true);

    for (const locale of selected) {
      setStatuses(prev => ({ ...prev, [locale]: 'loading' }));
      try {
        const res = await fetch(`/api/admin/blog/${postId}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetLocale: locale })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? 'Ошибка перевода');
        }

        const data = await res.json();
        setStatuses(prev => ({ ...prev, [locale]: 'success' }));
        onTranslated(locale, {
          title: data.title,
          description: data.description,
          content: data.content
        });
      } catch (error) {
        setStatuses(prev => ({ ...prev, [locale]: 'error' }));
        toast.error(
          `Ошибка перевода на ${locale}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
        );
      }
    }

    setIsTranslating(false);
    const allSuccess = selected.every(l => statuses[l] === 'success');
    if (allSuccess) {
      toast.success('Все переводы выполнены');
    }
  };

  const handleClose = () => {
    if (!isTranslating) {
      setStatuses({});
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Перевести статью</DialogTitle>
          <DialogDescription>
            Выберите языки для автоматического перевода с помощью ИИ. Статья будет переведена с
            русского языка.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {AVAILABLE_LOCALES.map(({ locale, label }) => {
            const status = statuses[locale];
            const hasTranslation = existingLocales.includes(locale);

            return (
              <div key={locale} className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox
                  id={`locale-${locale}`}
                  checked={selected.includes(locale)}
                  onCheckedChange={() => toggleLocale(locale)}
                  disabled={isTranslating}
                />
                <Label htmlFor={`locale-${locale}`} className="flex-1 cursor-pointer">
                  <span>{label}</span>
                  {hasTranslation && (
                    <span className="ml-2 text-xs text-muted-foreground">(уже есть перевод)</span>
                  )}
                </Label>
                <div className="w-5 h-5 flex items-center justify-center">
                  {status === 'loading' && (
                    <Loader2 className="size-4 animate-spin text-[#900A0B]" />
                  )}
                  {status === 'success' && <Check className="size-4 text-green-600" />}
                  {status === 'error' && <X className="size-4 text-red-600" />}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isTranslating}>
            {isTranslating ? 'Подождите...' : 'Закрыть'}
          </Button>
          <Button
            onClick={handleTranslate}
            disabled={selected.length === 0 || isTranslating}
            className="bg-[#900A0B] hover:bg-[#900A0B]/90 text-white"
          >
            {isTranslating ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Перевожу...
              </>
            ) : (
              'Перевести'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
