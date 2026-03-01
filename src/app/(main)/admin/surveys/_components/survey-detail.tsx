'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
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
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserPlus,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import {
  assignSurvey,
  addComment,
  markAsReadByAdmin,
  clearComments,
  deleteSurvey,
  removeAssignment
} from '../actions';
import { useTranslations } from 'next-intl';
import { EditSurveyForm } from './edit-survey-form';

function VisibilityObserver({
  onVisible,
  children,
  className
}: {
  onVisible: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

interface SurveyUser {
  id: string;
  name: string | null;
  email: string;
}

interface SurveyComment {
  id: string;
  text: string;
  createdAt: string;
  author: { name: string | null };
  isNew?: boolean;
}

interface SurveyResultData {
  id: string;
  answers: Record<string, unknown>;
  completedAt: string;
  comments: SurveyComment[];
}

interface SurveyAssignmentData {
  id: string;
  status: 'PENDING' | 'COMPLETED';
  user: SurveyUser;
  result: SurveyResultData | null;
}

interface SurveyQuestionData {
  id: string;
  text: string;
  type: string;
  options: string[] | null;
  order: number;
}

interface SurveyDetailProps {
  surveyId: string;
  title: string;
  description: string | null;
  questions: SurveyQuestionData[];
  assignments: SurveyAssignmentData[];
  allUsers: SurveyUser[];
}

export const SurveyDetail = ({
  surveyId,
  title,
  description,
  questions,
  assignments,
  allUsers
}: SurveyDetailProps) => {
  const t = useTranslations('AdminSurveys');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newCommentIds, setNewCommentIds] = useState(() => {
    const ids = new Set<string>();
    assignments.forEach(a => {
      a.result?.comments.forEach(c => {
        if (c.isNew) ids.add(c.id);
      });
    });
    return ids;
  });

  const hasMarkedRead = useRef(false);

  const handleCommentVisible = useCallback(
    (commentId: string) => {
      if (!hasMarkedRead.current) {
        markAsReadByAdmin(surveyId);
        hasMarkedRead.current = true;
      }

      setNewCommentIds(prev => {
        if (!prev.has(commentId)) return prev;

        setTimeout(() => {
          setNewCommentIds(innerPrev => {
            const next = new Set(innerPrev);
            next.delete(commentId);
            return next;
          });
        }, 5000);

        return prev;
      });
    },
    [surveyId]
  );

  const handleClearComments = async (resultId: string) => {
    setClearingId(resultId);
    const result = await clearComments(resultId);
    if (result.success) {
      router.refresh();
    }
    setClearingId(null);
  };

  const handleRemoveAssignment = async (userId: string, deleteResults: boolean) => {
    setDeletingId(userId);
    const result = await removeAssignment(surveyId, userId, deleteResults);
    if (result.success) {
      router.refresh();
    }
    setDeletingId(null);
  };

  const handleDeleteSurvey = async () => {
    setLoading(true);
    const result = await deleteSurvey(surveyId);
    if (result.success) {
      router.push('/admin/surveys');
    } else {
      setLoading(false);
    }
  };

  const assignedUserIds = assignments.map(a => a.user.id);
  const unassignedUsers = allUsers.filter(u => !assignedUserIds.includes(u.id));

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    await assignSurvey(surveyId, selectedUserId);
    setSelectedUserId('');
    setLoading(false);
    router.refresh();
  };

  const handleComment = async (resultId: string) => {
    const text = commentText[resultId];
    if (!text?.trim()) return;
    setLoading(true);
    await addComment(resultId, text);
    setCommentText(prev => ({ ...prev, [resultId]: '' }));
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="shrink-0">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('deleteSurvey') || 'Удалить опрос'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {tCommon('back') === 'Back' ? 'Are you absolutely sure?' : 'Вы уверены?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteSurveyConfirm') ||
                  'Вы действительно хотите удалить этот опрос? Все назначения и результаты будут безвозвратно удалены.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>{tCommon('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteSurvey}
                disabled={loading}
              >
                {loading ? '...' : t('deleteSurvey') || 'Удалить опрос'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="results">{t('tabsResults') || 'Назначения и ответы'}</TabsTrigger>
          <TabsTrigger value="edit">{t('tabsEdit') || 'Настройки'}</TabsTrigger>
        </TabsList>

        <TabsContent
          value="results"
          className="space-y-6 mt-6 focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              {/* Вопросы опроса */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('questions')}</CardTitle>
                  <CardDescription>
                    {t('questionsCount', { count: questions.length })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {questions
                      .sort((a, b) => a.order - b.order)
                      .map((q, i) => (
                        <div
                          key={q.id}
                          className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50 text-sm"
                        >
                          <p className="font-medium">
                            <span className="text-muted-foreground mr-1">{i + 1}.</span> {q.text}
                          </p>
                          <p className="text-xs text-muted-foreground ml-4">
                            {t(`type_${q.type}`)}
                            {q.options && <span> · {(q.options as string[]).join(', ')}</span>}
                          </p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Назначение пользователям */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    {t('assignTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('selectUser')} />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAssign}
                    disabled={!selectedUserId || loading}
                    className="w-full"
                  >
                    {t('assign')}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              {/* Результаты */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('results')}</CardTitle>
                  <CardDescription>{t('resultsDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {assignments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-lg border border-dashed">
                      <ShieldAlert className="h-8 w-8 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">{t('noAssignments')}</p>
                    </div>
                  ) : (
                    <Accordion type="multiple" className="w-full">
                      {assignments.map(assignment => {
                        const hasNewMessages =
                          assignment.result?.comments.some(c => newCommentIds.has(c.id)) ?? false;

                        return (
                          <AccordionItem
                            key={assignment.id}
                            value={assignment.id}
                            className="border px-4 rounded-lg mb-2 shadow-sm bg-card"
                          >
                            <AccordionTrigger className="hover:no-underline py-4">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center gap-2 text-left">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-[15px]">
                                      {assignment.user.name || assignment.user.email}
                                    </span>
                                    {hasNewMessages && (
                                      <span className="relative flex h-2 w-2 ml-1">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge
                                  variant={
                                    assignment.status === 'COMPLETED' ? 'default' : 'secondary'
                                  }
                                  className="shrink-0 ml-2"
                                >
                                  {assignment.status === 'COMPLETED' ? (
                                    <span className="flex items-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      {t('completed')}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5" />
                                      {t('pending')}
                                    </span>
                                  )}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                              <div className="flex justify-end mb-4 pt-2">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      disabled={deletingId === assignment.user.id}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      {deletingId === assignment.user.id
                                        ? '...'
                                        : t('removeAssignment') || 'Удалить назначение'}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        {tCommon('back') === 'Back'
                                          ? 'Remove Assignment?'
                                          : 'Удалить назначение?'}
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t('removeAssignmentConfirm') ||
                                          'Вы уверены, что хотите удалить этого пользователя из опроса? Вы можете удалить его результаты навсегда, либо сохранить их в архиве для статистики.'}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                                      <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                        <AlertDialogAction
                                          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full sm:w-auto"
                                          onClick={() =>
                                            handleRemoveAssignment(assignment.user.id, false)
                                          }
                                        >
                                          {t('removeKeepResults') || 'Оставить результаты'}
                                        </AlertDialogAction>
                                        <AlertDialogAction
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                                          onClick={() =>
                                            handleRemoveAssignment(assignment.user.id, true)
                                          }
                                        >
                                          {t('removeWithResults') || 'Удалить с результатами'}
                                        </AlertDialogAction>
                                      </div>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>

                              {assignment.result ? (
                                <div className="space-y-6">
                                  {/* Ответы */}
                                  <div className="space-y-3">
                                    <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">
                                      {t('answers')}
                                    </h4>
                                    <div className="grid gap-3">
                                      {questions
                                        .sort((a, b) => a.order - b.order)
                                        .map(q => (
                                          <div
                                            key={q.id}
                                            className="p-3 rounded-lg bg-muted/30 border border-muted text-sm relative"
                                          >
                                            <p className="font-medium mb-2 pr-6">{q.text}</p>
                                            <div className="pl-3 border-l-2 border-primary/40 text-muted-foreground font-medium">
                                              {JSON.stringify(
                                                (
                                                  assignment.result!.answers as Record<
                                                    string,
                                                    unknown
                                                  >
                                                )[q.id] ?? '—'
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>

                                  <Separator />

                                  {/* Комментарии */}
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                        <MessageSquare className="h-4 w-4" />
                                        {t('comments')}
                                      </h4>
                                      {assignment.result.comments.length > 0 && (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                              disabled={clearingId === assignment.result.id}
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              {clearingId === assignment.result.id
                                                ? t('clearing')
                                                : t('clearComments')}
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>
                                                {tCommon('back') === 'Back'
                                                  ? 'Are you absolutely sure?'
                                                  : 'Вы уверены?'}
                                              </AlertDialogTitle>
                                              <AlertDialogDescription>
                                                {t('clearCommentsConfirm')}
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>
                                                {tCommon('cancel')}
                                              </AlertDialogCancel>
                                              <AlertDialogAction
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                onClick={() =>
                                                  handleClearComments(assignment.result!.id)
                                                }
                                              >
                                                {t('clearComments')}
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      )}
                                    </div>
                                    <div className="space-y-3">
                                      {assignment.result.comments.length > 0 ? (
                                        assignment.result.comments.map(comment => {
                                          const isNewComment = newCommentIds.has(comment.id);

                                          const commentContent = (
                                            <div
                                              className={`p-3.5 rounded-lg border text-sm transition-all duration-500 shadow-sm ${
                                                isNewComment
                                                  ? 'bg-primary/5 border-primary shadow-primary/20'
                                                  : 'bg-card'
                                              }`}
                                            >
                                              <div className="flex items-start sm:items-center justify-between mb-2 gap-2 flex-wrap sm:flex-nowrap">
                                                <div className="font-semibold flex items-center gap-2 min-w-0">
                                                  <span className="truncate">
                                                    {comment.author.name || 'User'}
                                                  </span>
                                                  {isNewComment && (
                                                    <Badge
                                                      variant="default"
                                                      className="text-[10px] h-4 px-1.5 py-0 uppercase shrink-0"
                                                    >
                                                      Новое
                                                    </Badge>
                                                  )}
                                                </div>
                                                <p
                                                  className="text-xs text-muted-foreground shrink-0"
                                                  suppressHydrationWarning
                                                >
                                                  {new Date(comment.createdAt).toLocaleDateString(
                                                    'ru-RU'
                                                  )}
                                                </p>
                                              </div>
                                              <p className="whitespace-pre-wrap leading-relaxed">
                                                {comment.text}
                                              </p>
                                            </div>
                                          );

                                          if (isNewComment) {
                                            return (
                                              <VisibilityObserver
                                                key={comment.id}
                                                onVisible={() => handleCommentVisible(comment.id)}
                                              >
                                                {commentContent}
                                              </VisibilityObserver>
                                            );
                                          }

                                          return <div key={comment.id}>{commentContent}</div>;
                                        })
                                      ) : (
                                        <p className="text-sm text-muted-foreground py-2 text-center border border-dashed rounded-lg bg-muted/20">
                                          {t('noComments')}
                                        </p>
                                      )}
                                    </div>

                                    {/* Добавить комментарий */}
                                    <div className="flex flex-col gap-2 pt-2">
                                      <Textarea
                                        value={commentText[assignment.result.id] || ''}
                                        onChange={e =>
                                          setCommentText(prev => ({
                                            ...prev,
                                            [assignment.result!.id]: e.target.value
                                          }))
                                        }
                                        placeholder={t('addCommentPlaceholder')}
                                        className="resize-y min-h-[80px]"
                                      />
                                      <Button
                                        onClick={() => handleComment(assignment.result!.id)}
                                        disabled={
                                          !commentText[assignment.result!.id]?.trim() || loading
                                        }
                                        className="self-end"
                                      >
                                        <Send className="h-4 w-4 mr-2" />
                                        Отправить
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground py-6 text-center bg-muted/20 rounded-lg border border-dashed">
                                  <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
                                  <p>{t('notCompleted')}</p>
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="edit" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
          <EditSurveyForm
            surveyId={surveyId}
            initialTitle={title}
            initialDescription={description}
            initialQuestions={questions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
