'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { submitSurveyResult } from '../actions';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { savePendingSurvey } from '@/lib/hooks/use-survey-sync';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Send,
  ClipboardList,
  Loader2,
  Smile,
  Compass
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
 * Переработанная форма прохождения опроса.
 * Концепция "Safe Sanctuary": плавные анимации смены вопросов, премиальная шкала SCALE, приятный экран успеха.
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
  const [isSuccess, setIsSuccess] = useState(false); // Состояние экрана успеха

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
      setIsSuccess(true); // Показываем наш стильный экран успеха
      toast.success('Опрос успешно пройден!');
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
        'relative flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none group',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-muted hover:border-primary/30 hover:bg-muted/20'
      )}
    >
      {type === 'radio' ? (
        <div
          className={cn(
            'h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all',
            selected ? 'border-primary' : 'border-muted-foreground/30 group-hover:border-primary/40'
          )}
        >
          {selected && (
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-in zoom-in duration-200" />
          )}
        </div>
      ) : (
        <div
          className={cn(
            'h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-all',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/30 group-hover:border-primary/40'
          )}
        >
          {selected && (
            <CheckCircle2 className="h-3.5 w-3.5 fill-current animate-in zoom-in duration-200" />
          )}
        </div>
      )}
      <span
        className={cn(
          'text-sm font-semibold transition-colors duration-200',
          selected ? 'text-primary' : 'text-foreground/90'
        )}
      >
        {label}
      </span>
    </div>
  );

  if (!isLoaded) return null;

  // Экран успеха
  if (isSuccess) {
    return (
      <div className="w-full max-w-xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <Card className="border border-emerald-500/10 shadow-lg bg-gradient-to-br from-emerald-500/5 via-card to-card overflow-hidden rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl scale-125 animate-pulse" />
              <div className="relative p-5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="h-16 w-16" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Ответы отправлены!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                Спасибо за прохождение опроса. Ваши ответы успешно сохранены и переданы специалисту
                для анализа на следующей сессии.
              </p>
            </div>

            <Button
              onClick={() => {
                router.push('/my/surveys');
                router.refresh();
              }}
              className="h-11 rounded-xl px-8 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/15"
            >
              Вернуться в кабинет
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Липкий заголовок с прогрессом */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md pb-4 pt-2 border-b border-border/40">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold truncate max-w-[200px] sm:max-w-sm">
                {surveyTitle}
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                Вопрос {currentIndex + 1} из {sortedQuestions.length}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearDraft}
            className="text-muted-foreground hover:text-destructive gap-1.5 text-xs font-semibold h-8 px-2.5 rounded-lg hover:bg-muted/50"
          >
            <RotateCcw className="h-3 w-3" />
            {t('clearDraft')}
          </Button>
        </div>
        <Progress value={progress} className="h-1.5 bg-muted/60" />
      </div>

      {/* Контейнер вопроса с key-базированной анимацией переключения */}
      <div className="min-h-[400px] w-full" key={currentIndex}>
        <Card className="border border-border/60 shadow-sm overflow-hidden rounded-2xl animate-in fade-in slide-in-from-right-3 duration-250">
          <CardHeader className="bg-muted/5 pb-8 pt-8 px-6 sm:px-10 border-b border-border/40">
            <CardTitle className="text-lg sm:text-xl font-bold leading-snug">
              {currentQuestion.text}
            </CardTitle>
            {currentIndex === 0 && surveyDescription && (
              <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed">
                {surveyDescription}
              </p>
            )}
          </CardHeader>
          <CardContent className="pt-8 pb-8 px-6 sm:px-10">
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
                className="min-h-[220px] text-base p-4 bg-muted/5 focus:bg-background transition-all duration-200 border border-border/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50 focus-visible:ring-offset-0 rounded-xl leading-relaxed"
              />
            )}

            {currentQuestion.type === 'SCALE' && (
              <div className="space-y-12 py-8 px-2 sm:px-6">
                <div className="relative pt-6">
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[(answers[currentQuestion.id] as number) || 5]}
                    onValueChange={val => updateAnswer(currentQuestion.id, val[0])}
                    className="py-4 cursor-pointer"
                  />

                  {/* Подписи с цифрами */}
                  <div className="absolute -top-3 left-0 w-full flex justify-between px-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                      <span
                        key={val}
                        className={cn(
                          'text-xs font-bold transition-all duration-200',
                          ((answers[currentQuestion.id] as number) || 5) === val
                            ? 'text-primary scale-125 font-black drop-shadow-sm'
                            : 'text-muted-foreground/40'
                        )}
                      >
                        {val}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Полярные текстовые ориентиры */}
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 px-1 pt-1">
                  <span className="flex items-center gap-1">
                    <Smile className="h-3.5 w-3.5 text-muted-foreground/40" />
                    Слабо
                  </span>
                  <span className="flex items-center gap-1">
                    Очень сильно
                    <Compass className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </span>
                </div>

                {/* Карточка текущей оценки */}
                <div className="flex justify-between items-center text-sm font-semibold text-primary bg-primary/[0.03] p-4 rounded-xl border border-primary/20 shadow-sm max-w-xs mx-auto">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">
                    Ваша оценка:
                  </span>
                  <span className="text-3xl font-black tracking-tight">
                    {(answers[currentQuestion.id] as number) || 5}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/5 border-t border-border/40 p-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(prev => prev - 1)}
              disabled={isFirstQuestion}
              className="gap-2 px-6 h-11 w-full sm:w-auto text-sm font-bold rounded-xl border-border/80 hover:bg-background"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>

            {!isLastQuestion ? (
              <Button
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="gap-2 px-6 h-11 w-full sm:w-auto shadow-md text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary-dark transition-all duration-200"
              >
                Далее
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="gap-2 px-8 h-11 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/15 text-sm font-bold rounded-xl text-white transition-all duration-200"
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

      {/* Точки быстрой навигации */}
      <div className="flex justify-center gap-2 flex-wrap pt-2">
        {sortedQuestions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={cn(
              'h-2 rounded-full transition-all duration-250',
              currentIndex === idx
                ? 'w-7 bg-primary'
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
