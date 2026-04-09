'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { submitSurveyResult } from '../actions';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { savePendingSurvey } from '@/hooks/useSurveySync';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Send,
  ClipboardList,
  Loader2
} from 'lucide-react';

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'TEXT' | 'SCALE';
  options: string[] | null;
  order: number;
}

interface SurveyFormProps {
  assignmentId: string;
  surveyTitle: string;
  surveyDescription: string | null;
  questions: SurveyQuestion[];
}

/**
 * Улучшенная форма прохождения опроса.
 * Поддерживает пошаговый режим, анимации и премиальный UI.
 */
export const SurveyForm = ({
  assignmentId,
  surveyTitle,
  surveyDescription,
  questions
}: SurveyFormProps) => {
  const t = useTranslations('Surveys');
  const router = useRouter();

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.order - b.order),
    [questions]
  );

  // Восстановление из локального хранилища
  useEffect(() => {
    const loadDraft = () => {
      const savedDraft = localStorage.getItem(`survey_draft_${assignmentId}`);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed && typeof parsed === 'object') {
            setAnswers(parsed);
          }
        } catch (e) {
          console.error('Ошибка при чтении черновика опроса', e);
        }
      }
      setIsLoaded(true);
    };
    loadDraft();
  }, [assignmentId]);

  // Автосохранение
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(`survey_draft_${assignmentId}`, JSON.stringify(answers));
    }
  }, [answers, assignmentId, isLoaded]);

  const handleClearDraft = () => {
    if (confirm('Очистить все ответы?')) {
      setAnswers({});
      setCurrentIndex(0);
      localStorage.removeItem(`survey_draft_${assignmentId}`);
      toast.success('Черновик очищен');
    }
  };

  const updateAnswer = (questionId: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleMultiChoice = (questionId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const current = (prev[questionId] as string[]) || [];
      const updated = checked ? [...current, option] : current.filter(o => o !== option);
      return { ...prev, [questionId]: updated };
    });
  };

  const handleSubmit = async () => {
    if (!navigator.onLine) {
      savePendingSurvey(assignmentId, answers);
      toast.info('Нет интернета', {
        description: 'Ответы сохранены и отправятся автоматически.'
      });
      return;
    }

    setLoading(true);
    const result = await submitSurveyResult(assignmentId, answers);
    setLoading(false);

    if (result.success) {
      localStorage.removeItem(`survey_draft_${assignmentId}`);
      toast.success('Опрос успешно пройден!');
      router.push('/my/surveys');
      router.refresh();
    } else {
      toast.error('Ошибка при отправке', { description: result.error });
    }
  };

  const currentQuestion = sortedQuestions[currentIndex];
  const progress = ((currentIndex + 1) / sortedQuestions.length) * 100;
  const isLastQuestion = currentIndex === sortedQuestions.length - 1;
  const isFirstQuestion = currentIndex === 0;

  // Компонент для карточки варианта (Radio/Checkbox)
  const OptionCard = ({
    id,
    label,
    selected,
    onSelect,
    type = 'radio'
  }: {
    id: string;
    label: string;
    selected: boolean;
    onSelect: (checked: boolean) => void;
    type?: 'radio' | 'checkbox';
  }) => (
    <div
      onClick={() => onSelect(!selected)}
      className={cn(
        'relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer select-none group',
        selected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-muted hover:border-primary/40 hover:bg-muted/30'
      )}
    >
      {type === 'radio' ? (
        <div
          className={cn(
            'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
            selected ? 'border-primary' : 'border-muted-foreground/30 group-hover:border-primary/40'
          )}
        >
          {selected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
        </div>
      ) : (
        <div
          className={cn(
            'h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/30 group-hover:border-primary/40'
          )}
        >
          {selected && <CheckCircle2 className="h-3.5 w-3.5 fill-current" />}
        </div>
      )}
      <span
        className={cn(
          'text-sm font-medium transition-colors',
          selected ? 'text-primary' : 'text-foreground'
        )}
      >
        {label}
      </span>
    </div>
  );

  if (!isLoaded) return null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Липкий заголовок с прогрессом */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md pb-4 pt-2 border-b">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold truncate max-w-[200px] sm:max-w-sm">
                {surveyTitle}
              </h2>
              <p className="text-xs text-muted-foreground">
                Вопрос {currentIndex + 1} из {sortedQuestions.length}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearDraft}
            className="text-muted-foreground hover:text-destructive gap-1 text-xs"
          >
            <RotateCcw className="h-3 w-3" />
            {t('clearDraft')}
          </Button>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="min-h-[400px] w-full">
        <Card className="border-2 shadow-lg overflow-hidden transition-all duration-300">
          <CardHeader className="bg-muted/20 pb-8">
            <CardTitle className="text-xl sm:text-2xl leading-tight">
              {currentQuestion.text}
            </CardTitle>
            {currentIndex === 0 && surveyDescription && (
              <p className="text-sm text-muted-foreground mt-2 italic">{surveyDescription}</p>
            )}
          </CardHeader>
          <CardContent className="pt-8 px-6 sm:px-10">
            {currentQuestion.type === 'SINGLE_CHOICE' && currentQuestion.options && (
              <div className="grid gap-3">
                {currentQuestion.options.map(option => (
                  <OptionCard
                    key={option}
                    id={`${currentQuestion.id}-${option}`}
                    label={option}
                    selected={answers[currentQuestion.id] === option}
                    onSelect={() => updateAnswer(currentQuestion.id, option)}
                  />
                ))}
              </div>
            )}

            {currentQuestion.type === 'MULTI_CHOICE' && currentQuestion.options && (
              <div className="grid gap-3">
                {currentQuestion.options.map(option => (
                  <OptionCard
                    key={option}
                    id={`${currentQuestion.id}-${option}`}
                    label={option}
                    type="checkbox"
                    selected={((answers[currentQuestion.id] as string[]) || []).includes(option)}
                    onSelect={checked => toggleMultiChoice(currentQuestion.id, option, checked)}
                  />
                ))}
              </div>
            )}

            {currentQuestion.type === 'TEXT' && (
              <Textarea
                value={(answers[currentQuestion.id] as string) || ''}
                onChange={e => updateAnswer(currentQuestion.id, e.target.value)}
                placeholder={t('textPlaceholder')}
                className="min-h-[200px] text-lg p-4 bg-muted/5 focus:bg-background transition-colors border-2"
              />
            )}

            {currentQuestion.type === 'SCALE' && (
              <div className="space-y-10 py-8">
                <div className="relative pt-12">
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[(answers[currentQuestion.id] as number) || 5]}
                    onValueChange={val => updateAnswer(currentQuestion.id, val[0])}
                    className="py-4 cursor-pointer"
                  />
                  <div className="absolute -top-4 left-0 w-full flex justify-between px-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                      <span
                        key={val}
                        className={cn(
                          'text-xs font-bold transition-all',
                          ((answers[currentQuestion.id] as number) || 5) === val
                            ? 'text-primary scale-125 translate-y-[-4px]'
                            : 'text-muted-foreground/40'
                        )}
                      >
                        {val}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-primary bg-primary/5 p-4 rounded-xl border border-primary/20">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">
                    Ваш выбор:
                  </span>
                  <span className="text-2xl font-black">
                    {(answers[currentQuestion.id] as number) || 5}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/5 border-t p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(prev => prev - 1)}
              disabled={isFirstQuestion}
              className="gap-2 px-8 min-w-[120px] h-11 w-full sm:w-auto text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>

            {!isLastQuestion ? (
              <Button
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="gap-2 px-8 min-w-[120px] h-11 w-full sm:w-auto shadow-primary/20 shadow-lg text-sm font-semibold"
              >
                Далее
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="gap-2 px-8 min-w-[140px] h-11 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 shadow-lg text-sm font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('submitting')}
                  </span>
                ) : (
                  <>
                    {t('submit')}
                    <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Квик-навигация внизу (точки или номера) */}
      <div className="flex justify-center gap-1.5 flex-wrap">
        {sortedQuestions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={cn(
              'h-2 rounded-full transition-all',
              currentIndex === idx
                ? 'w-8 bg-primary'
                : answers[sortedQuestions[idx].id]
                  ? 'w-2 bg-emerald-500/50 hover:bg-emerald-500'
                  : 'w-2 bg-muted hover:bg-muted-foreground/30'
            )}
            title={`Вопрос ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
