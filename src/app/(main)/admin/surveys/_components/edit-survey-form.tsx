'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, GripVertical, CheckCircle2, ChevronDown, X, RotateCcw } from 'lucide-react';
import { updateSurvey } from '../actions';
import { useTranslations } from 'next-intl';

interface QuestionDraft {
  id?: string;
  text: string;
  type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'TEXT' | 'SCALE';
  options: string[];
}

interface SortableQuestionProps {
  question: QuestionDraft;
  index: number;
  t: ReturnType<typeof useTranslations>;
  onRemove: () => void;
  onUpdateText: (text: string) => void;
  onUpdateType: (type: QuestionDraft['type']) => void;
  onAddOption: () => void;
  onRemoveOption: (optionIndex: number) => void;
  onUpdateOption: (optionIndex: number, value: string) => void;
}

/**
 * Сортируемая карточка вопроса — компактный горизонтальный layout.
 */
const SortableQuestion = ({
  question,
  index,
  t,
  onRemove,
  onUpdateText,
  onUpdateType,
  onAddOption,
  onRemoveOption,
  onUpdateOption
}: SortableQuestionProps) => {
  const dndId = question.id || `new-${index}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dndId
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 rounded-xl border bg-card transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-primary relative z-50' : 'shadow-sm'
      }`}
    >
      {/* Заголовок вопроса */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-muted shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
          {index + 1}
        </span>
        <span className="text-sm font-medium text-muted-foreground flex-1">
          {t('questionNumber', { number: index + 1 })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Поля: текст и тип — горизонтальная сетка */}
      <div className="grid gap-3 sm:grid-cols-[1fr,200px]">
        <div className="space-y-1.5">
          <Label className="text-xs">{t('questionText')}</Label>
          <Input
            value={question.text}
            onChange={e => onUpdateText(e.target.value)}
            placeholder={t('questionTextPlaceholder')}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('questionType')}</Label>
          <Select
            value={question.type}
            onValueChange={val => onUpdateType(val as QuestionDraft['type'])}
          >
            <SelectTrigger className="h-9">
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
      </div>

      {/* Варианты ответов — компактный список */}
      {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTI_CHOICE') && (
        <div className="mt-3 space-y-2">
          <Label className="text-xs">{t('options')}</Label>
          <div className="space-y-1.5">
            {question.options.map((option, oIndex) => (
              <div key={`opt-${dndId}-${oIndex}`} className="flex gap-1.5">
                <Input
                  value={option}
                  onChange={e => onUpdateOption(oIndex, e.target.value)}
                  placeholder={t('optionPlaceholder', { number: oIndex + 1 })}
                  className="h-8 text-sm"
                />
                {question.options.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveOption(oIndex)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={onAddOption} className="h-7 text-xs">
            <Plus className="mr-1 h-3 w-3" />
            {t('addOption')}
          </Button>
        </div>
      )}
    </div>
  );
};

interface EditSurveyFormProps {
  surveyId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialQuestions: {
    id: string;
    text: string;
    type: string;
    options: string[] | null;
    order: number;
  }[];
}

/**
 * Форма редактирования опроса с DnD-сортировкой.
 * Данные опроса — collapsible секция (по умолчанию свёрнута).
 */
export const EditSurveyForm = ({
  surveyId,
  initialTitle,
  initialDescription,
  initialQuestions
}: EditSurveyFormProps) => {
  const t = useTranslations('AdminSurveys');
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription || '');
  const [questions, setQuestions] = useState<QuestionDraft[]>(() =>
    initialQuestions
      .sort((a, b) => a.order - b.order)
      .map(q => ({
        id: q.id,
        text: q.text,
        type: q.type as QuestionDraft['type'],
        options: q.options || ['']
      }))
  );

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQuestions(prev => {
        const activeId = active.id.toString();
        const overId = over.id.toString();
        const oldIndex = prev.findIndex((q, i) => (q.id || `new-${i}`) === activeId);
        const newIndex = prev.findIndex((q, i) => (q.id || `new-${i}`) === overId);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  /** Добавляет новый вопрос */
  const addQuestion = () => {
    setQuestions(prev => [...prev, { text: '', type: 'SINGLE_CHOICE', options: [''] }]);
  };

  /** Удаляет вопрос по индексу */
  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  /** Обновляет текст вопроса */
  const updateQuestionText = (index: number, text: string) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, text } : q)));
  };

  /** Обновляет тип вопроса */
  const updateQuestionType = (index: number, type: QuestionDraft['type']) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, type } : q)));
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
          ? { ...q, options: q.options.map((o, oi) => (oi === optionIndex ? value : o)) }
          : q
      )
    );
  };

  /** Отправляет изменения на сервер */
  const handleSubmit = async () => {
    if (!title.trim() || questions.length === 0) return;

    setLoading(true);
    setSaved(false);

    const result = await updateSurvey({
      id: surveyId,
      title,
      description: description || undefined,
      questions: questions.map((q, i) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.type === 'TEXT' ? [] : q.options.filter(o => o.trim()),
        order: i
      }))
    });

    setLoading(false);

    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    }
  };

  /** Сбрасывает форму к начальным значениям */
  const resetForm = () => {
    setTitle(initialTitle);
    setDescription(initialDescription || '');
    setQuestions(
      initialQuestions
        .sort((a, b) => a.order - b.order)
        .map(q => ({
          id: q.id,
          text: q.text,
          type: q.type as QuestionDraft['type'],
          options: q.options || ['']
        }))
    );
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Данные опроса — collapsible (свёрнуто по умолчанию) */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
              <div>
                <CardTitle className="text-lg">{t('surveyDetails')}</CardTitle>
                <CardDescription className="mt-1">{t('editSurveyDetailsDesc')}</CardDescription>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform shrink-0 ${
                  detailsOpen ? '' : '-rotate-90'
                }`}
              />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-1.5">
                <Label htmlFor="edit-title" className="text-xs font-semibold">
                  {t('surveyTitle')}
                </Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={t('surveyTitlePlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-desc" className="text-xs font-semibold">
                  {t('surveyDescription')}
                </Label>
                <Textarea
                  id="edit-desc"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t('surveyDescPlaceholder')}
                  className="min-h-[80px] resize-y"
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Заголовок секции «Вопросы» */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">
          {t('questions')}{' '}
          {questions.length > 0 && (
            <span className="text-muted-foreground font-normal">({questions.length})</span>
          )}
        </h3>
      </div>

      {/* Список вопросов с DnD */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={questions.map((q, i) => q.id || `new-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {questions.map((question, qIndex) => (
              <SortableQuestion
                key={question.id || `new-${qIndex}`}
                question={question}
                index={qIndex}
                t={t}
                onRemove={() => removeQuestion(qIndex)}
                onUpdateText={text => updateQuestionText(qIndex, text)}
                onUpdateType={type => updateQuestionType(qIndex, type)}
                onAddOption={() => addOption(qIndex)}
                onRemoveOption={oIndex => removeOption(qIndex, oIndex)}
                onUpdateOption={(oIndex, val) => updateOption(qIndex, oIndex, val)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Добавить вопрос */}
      <Button
        variant="outline"
        onClick={addQuestion}
        className="w-full border-dashed hover:border-primary/50 hover:bg-primary/5"
      >
        <Plus className="mr-2 h-4 w-4" />
        {t('addQuestion')}
      </Button>

      {/* Футер */}
      <div className="flex justify-between items-center pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetForm}
          type="button"
          disabled={loading}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('cancelChanges')}
        </Button>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2">
              <CheckCircle2 className="h-4 w-4" />
              {t('surveyUpdated')}
            </span>
          )}
          <Button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || questions.length === 0}
          >
            {loading ? t('saving') : t('saveChanges')}
          </Button>
        </div>
      </div>
    </div>
  );
};
