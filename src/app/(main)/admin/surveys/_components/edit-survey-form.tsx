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
import { Plus, Trash2, GripVertical, CheckCircle2 } from 'lucide-react';
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
  // Используем index как fallback id для новых вопросов при сортировке, если нет id
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
    <Card
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'shadow-lg ring-2 ring-primary relative z-50' : ''}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-muted"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            {t('questionNumber', { number: index + 1 })}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t('questionText')}</Label>
          <Input
            value={question.text}
            onChange={e => onUpdateText(e.target.value)}
            placeholder={t('questionTextPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('questionType')}</Label>
          <Select
            value={question.type}
            onValueChange={val => onUpdateType(val as QuestionDraft['type'])}
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
                  onChange={e => onUpdateOption(oIndex, e.target.value)}
                  placeholder={t('optionPlaceholder', { number: oIndex + 1 })}
                />
                {question.options.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => onRemoveOption(oIndex)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={onAddOption}>
              <Plus className="mr-1 h-3 w-3" />
              {t('addOption')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
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
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => {
    return initialQuestions
      .sort((a, b) => a.order - b.order)
      .map(q => ({
        id: q.id,
        text: q.text,
        type: q.type as any,
        options: q.options || ['']
      }));
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const addQuestion = () => {
    setQuestions(prev => [
      ...prev,
      {
        text: '',
        type: 'SINGLE_CHOICE',
        options: ['']
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuestionText = (index: number, text: string) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, text } : q)));
  };

  const updateQuestionType = (index: number, type: QuestionDraft['type']) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, type } : q)));
  };

  const addOption = (questionIndex: number) => {
    setQuestions(prev =>
      prev.map((q, i) => (i === questionIndex ? { ...q, options: [...q.options, ''] } : q))
    );
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions(prev =>
      prev.map((q, i) =>
        i === questionIndex ? { ...q, options: q.options.filter((_, oi) => oi !== optionIndex) } : q
      )
    );
  };

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
        options: q.type === 'TEXT' ? undefined : q.options.filter(o => o.trim()),
        order: i
      }))
    });

    setLoading(false);

    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } else {
      console.error(result.error);
    }
  };

  const resetForm = () => {
    setTitle(initialTitle);
    setDescription(initialDescription || '');
    setQuestions(
      initialQuestions
        .sort((a, b) => a.order - b.order)
        .map(q => ({
          id: q.id,
          text: q.text,
          type: q.type as any,
          options: q.options || ['']
        }))
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{t('surveyDetails')}</CardTitle>
          <CardDescription>{t('editSurveyDetailsDesc') || t('surveyDetailsDesc')}</CardDescription>
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

      <div className="space-y-4">
        <h3 className="text-lg font-medium">{t('questions')}</h3>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={questions.map((q, i) => q.id || `new-${i}`)}
            strategy={verticalListSortingStrategy}
          >
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
          </SortableContext>
        </DndContext>
      </div>

      <Button variant="outline" onClick={addQuestion} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        {t('addQuestion')}
      </Button>

      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="ghost" onClick={resetForm} type="button" disabled={loading}>
          {t('cancelChanges') || 'Отменить изменения'}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !title.trim() || questions.length === 0}
          size="lg"
        >
          {loading ? t('saving') || 'Сохранение...' : t('saveChanges') || 'Сохранить изменения'}
        </Button>
      </div>

      {saved && (
        <div className="text-sm text-green-600 dark:text-green-400 flex items-center justify-end gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4" />
          {t('surveyUpdated') || 'Изменения сохранены'}
        </div>
      )}
    </div>
  );
};
