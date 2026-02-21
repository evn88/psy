'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { createSurvey } from '../actions';
import { useTranslations } from 'next-intl';

interface QuestionDraft {
  id: string;
  text: string;
  type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'TEXT' | 'SCALE';
  options: string[];
}

/**
 * Форма создания нового опроса.
 * Позволяет динамически добавлять вопросы разных типов.
 */
export const CreateSurveyForm = () => {
  const t = useTranslations('AdminSurveys');
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [loading, setLoading] = useState(false);

  /** Добавляет новый вопрос */
  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: '',
        type: 'SINGLE_CHOICE',
        options: ['']
      }
    ]);
  };

  /** Удаляет вопрос по индексу */
  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  /** Обновляет поле вопроса */
  const updateQuestion = (index: number, field: keyof QuestionDraft, value: unknown) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)));
  };

  /** Добавляет вариант ответа к вопросу */
  const addOption = (questionIndex: number) => {
    setQuestions(prev =>
      prev.map((q, i) => (i === questionIndex ? { ...q, options: [...q.options, ''] } : q))
    );
  };

  /** Удаляет вариант ответа */
  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions(prev =>
      prev.map((q, i) =>
        i === questionIndex ? { ...q, options: q.options.filter((_, oi) => oi !== optionIndex) } : q
      )
    );
  };

  /** Обновляет текст варианта ответа */
  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions(prev =>
      prev.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: q.options.map((o, oi) => (oi === optionIndex ? value : o))
            }
          : q
      )
    );
  };

  /** Отправляет форму на сервер */
  const handleSubmit = async () => {
    if (!title.trim() || questions.length === 0) return;

    setLoading(true);
    const result = await createSurvey({
      title,
      description: description || undefined,
      questions: questions.map((q, i) => ({
        text: q.text,
        type: q.type,
        options: q.type === 'TEXT' ? undefined : q.options.filter(o => o.trim()),
        order: i
      }))
    });

    setLoading(false);

    if (result.success) {
      router.push('/admin/surveys');
      router.refresh();
    } else {
      console.error(result.error);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{t('surveyDetails')}</CardTitle>
          <CardDescription>{t('surveyDetailsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('surveyTitle')}</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('surveyTitlePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">{t('surveyDescription')}</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('surveyDescPlaceholder')}
            />
          </div>
        </CardContent>
      </Card>

      {questions.map((question, qIndex) => (
        <Card key={question.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                {t('questionNumber', { number: qIndex + 1 })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('questionText')}</Label>
              <Input
                value={question.text}
                onChange={e => updateQuestion(qIndex, 'text', e.target.value)}
                placeholder={t('questionTextPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('questionType')}</Label>
              <Select
                value={question.type}
                onValueChange={val => updateQuestion(qIndex, 'type', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE_CHOICE">{t('typeSingle')}</SelectItem>
                  <SelectItem value="MULTI_CHOICE">{t('typeMulti')}</SelectItem>
                  <SelectItem value="TEXT">{t('typeText')}</SelectItem>
                  <SelectItem value="SCALE">{t('typeScale')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTI_CHOICE') && (
              <div className="space-y-2">
                <Label>{t('options')}</Label>
                {question.options.map((option, oIndex) => (
                  <div key={oIndex} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                      placeholder={t('optionPlaceholder', { number: oIndex + 1 })}
                    />
                    {question.options.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(qIndex, oIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addOption(qIndex)}>
                  <Plus className="mr-1 h-3 w-3" />
                  {t('addOption')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={addQuestion} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        {t('addQuestion')}
      </Button>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={loading || !title.trim() || questions.length === 0}
          size="lg"
        >
          {loading ? t('creating') : t('createSurvey')}
        </Button>
      </div>
    </div>
  );
};
