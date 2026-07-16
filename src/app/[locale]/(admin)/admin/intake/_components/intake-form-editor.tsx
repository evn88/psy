'use client';

import { useState, useTransition } from 'react';
import { Check, ChevronDown, ChevronUp, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  intakeQuestionTypes,
  type IntakeFormSteps,
  type IntakeQuestion,
  type IntakeQuestionType
} from '@/modules/intake/form-definition';
import { updateIntakeForm } from '../actions';

interface IntakeFormEditorProps {
  locale: string;
  initialSteps: IntakeFormSteps;
  version: number;
}

const questionTypeLabels: Record<IntakeQuestionType, string> = {
  SHORT_TEXT: 'Короткий текст',
  LONG_TEXT: 'Развёрнутый текст',
  NUMBER: 'Число',
  SINGLE_CHOICE: 'Один вариант',
  MULTI_CHOICE: 'Несколько вариантов'
};

const supportsOptions = (type: IntakeQuestionType) =>
  type === 'SINGLE_CHOICE' || type === 'MULTI_CHOICE';

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const createQuestion = (): IntakeQuestion => ({
  id: createId('question'),
  label: '',
  type: 'SHORT_TEXT',
  required: false,
  options: []
});

/** Редактор шагов и вопросов первичной анкеты. */
export const IntakeFormEditor = ({ locale, initialSteps, version }: IntakeFormEditorProps) => {
  const [steps, setSteps] = useState<IntakeFormSteps>(initialSteps);
  const [isPending, startTransition] = useTransition();

  const updateStep = (stepIndex: number, patch: Partial<IntakeFormSteps[number]>) => {
    setSteps(current =>
      current.map((step, index) => (index === stepIndex ? { ...step, ...patch } : step))
    );
  };

  const updateQuestion = (
    stepIndex: number,
    questionIndex: number,
    patch: Partial<IntakeQuestion>
  ) => {
    setSteps(current =>
      current.map((step, currentStepIndex) => {
        if (currentStepIndex !== stepIndex) return step;

        return {
          ...step,
          questions: step.questions.map((question, currentQuestionIndex) =>
            currentQuestionIndex === questionIndex ? { ...question, ...patch } : question
          )
        };
      })
    );
  };

  const moveStep = (stepIndex: number, direction: -1 | 1) => {
    const nextIndex = stepIndex + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;

    setSteps(current => {
      const next = [...current];
      [next[stepIndex], next[nextIndex]] = [next[nextIndex], next[stepIndex]];
      return next;
    });
  };

  const moveQuestion = (stepIndex: number, questionIndex: number, direction: -1 | 1) => {
    const nextIndex = questionIndex + direction;
    if (nextIndex < 0 || nextIndex >= steps[stepIndex].questions.length) return;

    setSteps(current =>
      current.map((step, currentStepIndex) => {
        if (currentStepIndex !== stepIndex) return step;
        const questions = [...step.questions];
        [questions[questionIndex], questions[nextIndex]] = [
          questions[nextIndex],
          questions[questionIndex]
        ];
        return { ...step, questions };
      })
    );
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateIntakeForm(locale, steps);
      if (result.success) {
        toast.success(`Анкета опубликована: версия ${result.version}`);
        return;
      }
      toast.error(result.error);
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Настройки публикации</CardTitle>
          <CardDescription>
            Текущая версия: {version}. Согласие на обработку данных остаётся первым обязательным
            шагом.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Save className="mr-2 size-4 animate-pulse" />
            ) : (
              <Check className="mr-2 size-4" />
            )}
            Опубликовать изменения
          </Button>
        </CardContent>
      </Card>

      {steps.map((step, stepIndex) => (
        <Card key={step.id} className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span>Шаг {stepIndex + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label="Переместить шаг выше"
                    onClick={() => moveStep(stepIndex, -1)}
                    disabled={stepIndex === 0}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label="Переместить шаг ниже"
                    onClick={() => moveStep(stepIndex, 1)}
                    disabled={stepIndex === steps.length - 1}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`step-title-${step.id}`}>Название шага</Label>
                    <Input
                      id={`step-title-${step.id}`}
                      value={step.title}
                      onChange={event => updateStep(stepIndex, { title: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`step-description-${step.id}`}>Описание шага</Label>
                    <Input
                      id={`step-description-${step.id}`}
                      value={step.description ?? ''}
                      onChange={event => updateStep(stepIndex, { description: event.target.value })}
                    />
                  </div>
                </div>
              </div>
              {steps.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  aria-label="Удалить шаг"
                  onClick={() =>
                    setSteps(current => current.filter((_, index) => index !== stepIndex))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {step.questions.map((question, questionIndex) => (
              <QuestionEditor
                key={question.id}
                question={question}
                questionIndex={questionIndex}
                questionsCount={step.questions.length}
                onChange={patch => updateQuestion(stepIndex, questionIndex, patch)}
                onMove={direction => moveQuestion(stepIndex, questionIndex, direction)}
                onRemove={() =>
                  updateStep(stepIndex, {
                    questions: step.questions.filter((_, index) => index !== questionIndex)
                  })
                }
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateStep(stepIndex, { questions: [...step.questions, createQuestion()] })
              }
            >
              <Plus className="mr-2 size-4" />
              Добавить вопрос
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        onClick={() =>
          setSteps(current => [
            ...current,
            { id: createId('step'), title: 'Новый шаг', questions: [createQuestion()] }
          ])
        }
      >
        <Plus className="mr-2 size-4" />
        Добавить шаг
      </Button>
    </div>
  );
};

interface QuestionEditorProps {
  question: IntakeQuestion;
  questionIndex: number;
  questionsCount: number;
  onChange: (patch: Partial<IntakeQuestion>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

const QuestionEditor = ({
  question,
  questionIndex,
  questionsCount,
  onChange,
  onMove,
  onRemove
}: QuestionEditorProps) => {
  const updateOption = (optionIndex: number, label: string) => {
    onChange({
      options: question.options.map((option, index) =>
        index === optionIndex ? { ...option, label } : option
      )
    });
  };

  const changeType = (type: IntakeQuestionType) => {
    onChange({ type, options: supportsOptions(type) ? question.options : [] });
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Вопрос {questionIndex + 1}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Переместить вопрос выше"
            onClick={() => onMove(-1)}
            disabled={questionIndex === 0}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Переместить вопрос ниже"
            onClick={() => onMove(1)}
            disabled={questionIndex === questionsCount - 1}
          >
            <ChevronDown className="size-4" />
          </Button>
          {questionsCount > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              aria-label="Удалить вопрос"
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr,220px]">
        <div className="space-y-1.5">
          <Label htmlFor={`question-label-${question.id}`}>Текст вопроса</Label>
          <Textarea
            id={`question-label-${question.id}`}
            value={question.label}
            onChange={event => onChange({ label: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Тип ответа</Label>
          <Select
            value={question.type}
            onValueChange={value => changeType(value as IntakeQuestionType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {intakeQuestionTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {questionTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`question-helper-${question.id}`}>Подсказка</Label>
        <Input
          id={`question-helper-${question.id}`}
          value={question.helperText ?? ''}
          onChange={event => onChange({ helperText: event.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id={`question-required-${question.id}`}
          checked={question.required}
          onCheckedChange={required => onChange({ required })}
        />
        <Label htmlFor={`question-required-${question.id}`}>Обязательный вопрос</Label>
      </div>
      {supportsOptions(question.type) && (
        <div className="space-y-2 border-t pt-3">
          <Label>Варианты ответа</Label>
          {question.options.map((option, optionIndex) => (
            <div key={option.id} className="flex gap-2">
              <Input
                value={option.label}
                aria-label={`Вариант ${optionIndex + 1}`}
                onChange={event => updateOption(optionIndex, event.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                aria-label="Удалить вариант"
                onClick={() =>
                  onChange({
                    options: question.options.filter((_, index) => index !== optionIndex)
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({ options: [...question.options, { id: createId('option'), label: '' }] })
            }
          >
            <Plus className="mr-2 size-4" />
            Добавить вариант
          </Button>
        </div>
      )}
    </div>
  );
};
