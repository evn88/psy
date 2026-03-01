'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { submitSurveyResult } from '../actions';
import { useTranslations } from 'next-intl';

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
 * Форма прохождения опроса.
 * Поддерживает типы: одиночный выбор, множественный выбор, текст, шкала.
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

  // Восстановление из локального хранилища
  useEffect(() => {
    /** Загружает черновик ответов из локального хранилища */
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

    const timer = setTimeout(loadDraft, 0);
    return () => clearTimeout(timer);
  }, [assignmentId]);

  // Автосохранение при изменении данных
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(`survey_draft_${assignmentId}`, JSON.stringify(answers));
    }
  }, [answers, assignmentId, isLoaded]);

  const handleClearDraft = () => {
    setAnswers({});
    localStorage.removeItem(`survey_draft_${assignmentId}`);
  };

  /** Обновляет ответ на конкретный вопрос */
  const updateAnswer = (questionId: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  /** Обрабатывает чекбокс (множественный выбор) */
  const toggleMultiChoice = (questionId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const current = (prev[questionId] as string[]) || [];
      const updated = checked ? [...current, option] : current.filter(o => o !== option);
      return { ...prev, [questionId]: updated };
    });
  };

  /** Отправляет результат на сервер */
  const handleSubmit = async () => {
    setLoading(true);
    const result = await submitSurveyResult(assignmentId, answers);
    setLoading(false);

    if (result.success) {
      localStorage.removeItem(`survey_draft_${assignmentId}`);
      router.push('/my/surveys');
      router.refresh();
    } else {
      console.error(result.error);
    }
  };

  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{surveyTitle}</h2>
        {surveyDescription && <p className="text-muted-foreground mt-1">{surveyDescription}</p>}
      </div>

      {sortedQuestions.map((question, index) => (
        <Card key={question.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {index + 1}. {question.text}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {question.type === 'SINGLE_CHOICE' && question.options && (
              <RadioGroup
                value={(answers[question.id] as string) || ''}
                onValueChange={val => updateAnswer(question.id, val)}
                className="space-y-2"
              >
                {(question.options as string[]).map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                    <Label
                      htmlFor={`${question.id}-${option}`}
                      className="font-normal cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {question.type === 'MULTI_CHOICE' && question.options && (
              <div className="space-y-2">
                {(question.options as string[]).map(option => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${question.id}-${option}`}
                      checked={((answers[question.id] as string[]) || []).includes(option)}
                      onCheckedChange={checked =>
                        toggleMultiChoice(question.id, option, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`${question.id}-${option}`}
                      className="font-normal cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {question.type === 'TEXT' && (
              <Textarea
                value={(answers[question.id] as string) || ''}
                onChange={e => updateAnswer(question.id, e.target.value)}
                placeholder={t('textPlaceholder')}
                className="min-h-[100px]"
              />
            )}

            {question.type === 'SCALE' && (
              <div className="space-y-4">
                <Slider
                  defaultValue={[5]}
                  min={1}
                  max={10}
                  step={1}
                  value={[(answers[question.id] as number) || 5]}
                  onValueChange={val => updateAnswer(question.id, val[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span className="font-medium text-foreground text-sm">
                    {(answers[question.id] as number) || 5}
                  </span>
                  <span>10</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Button
          variant="destructive"
          onClick={handleClearDraft}
          type="button"
          className="w-full sm:w-auto"
        >
          {t('clearDraft')}
        </Button>
        <Button onClick={handleSubmit} disabled={loading} size="lg" className="w-full sm:w-auto">
          {loading ? t('submitting') : t('submit')}
        </Button>
      </div>
    </div>
  );
};
