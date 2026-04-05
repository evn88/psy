'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlignLeft,
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Clock,
  Eye,
  Gauge,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  Send,
  Trash2,
  UserPlus
} from 'lucide-react';
import {
  addComment,
  assignSurvey,
  clearComments,
  deleteSurvey,
  markAsReadByAdmin,
  removeAssignment
} from '../actions';
import { useTranslations } from 'next-intl';
import { EditSurveyForm } from './edit-survey-form';
import Link from 'next/link';

/**
 * Наблюдатель видимости для автоматической пометки комментариев как прочитанных.
 */
const VisibilityObserver = ({
  onVisible,
  children,
  className
}: {
  onVisible: () => void;
  children: React.ReactNode;
  className?: string;
}) => {
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
};

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

/** Иконка типа вопроса */
const QuestionTypeIcon = ({ type }: { type: string }) => {
  const iconMap: Record<string, React.ReactNode> = {
    SINGLE_CHOICE: <CircleDot className="h-3.5 w-3.5" />,
    MULTI_CHOICE: <ListChecks className="h-3.5 w-3.5" />,
    TEXT: <AlignLeft className="h-3.5 w-3.5" />,
    SCALE: <Gauge className="h-3.5 w-3.5" />
  };
  return <span className="text-muted-foreground">{iconMap[type] ?? null}</span>;
};

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
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

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
    setAssignDialogOpen(false);
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

  const completedCount = assignments.filter(a => a.status === 'COMPLETED').length;
  const pendingCount = assignments.filter(a => a.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link
              href="/admin/surveys"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('backToList')}
            </Link>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">{description}</p>
          )}
          {/* Статистика */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Badge variant="outline" className="gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              {completedCount} {t('completed').toLowerCase()}
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Clock className="h-3 w-3" />
              {pendingCount} {t('pending').toLowerCase()}
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              {t('questionsCount', { count: questions.length })}
            </Badge>
          </div>
        </div>

        {/* Действия */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Кнопка назначения */}
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('assignUser')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  {t('assignTitle')}
                </DialogTitle>
                <DialogDescription>{t('selectUser')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {unassignedUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('noAssignments')}
                  </p>
                ) : (
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('selectUser')} />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.name || user.email}</span>
                            {user.name && (
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAssign}
                  disabled={!selectedUserId || loading}
                  className="w-full sm:w-auto"
                >
                  {t('assign')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dropdown — дополнительные действия */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/surveys/${surveyId}`} className="cursor-pointer">
                  {t('editSurvey')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={e => e.preventDefault()}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('deleteSurvey')}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {tCommon('back') === 'Back' ? 'Are you absolutely sure?' : 'Вы уверены?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>{t('deleteSurveyConfirm')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>{tCommon('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDeleteSurvey}
                      disabled={loading}
                    >
                      {loading ? '...' : t('deleteSurvey')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Табы */}
      <Tabs defaultValue="results" className="w-full">
        <TabsList className="inline-flex h-10 bg-muted/60 p-1 rounded-lg">
          <TabsTrigger value="results" className="gap-1.5 text-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            {t('tabsResults')}
          </TabsTrigger>
          <TabsTrigger value="edit" className="gap-1.5 text-sm">
            {t('tabsEdit')}
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5 text-sm">
            <Eye className="h-3.5 w-3.5" />
            {t('tabsPreview')}
          </TabsTrigger>
        </TabsList>

        {/* ====================== Вкладка «Результаты» ====================== */}
        <TabsContent
          value="results"
          className="space-y-4 mt-6 focus-visible:outline-none focus-visible:ring-0"
        >
          {assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border bg-muted/20">
              <UserPlus className="h-8 w-8 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-sm">{t('noAssignments')}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                onClick={() => setAssignDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t('assignUser')}
              </Button>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full space-y-2">
              {assignments.map(assignment => {
                const hasNewMessages =
                  assignment.result?.comments.some(c => newCommentIds.has(c.id)) ?? false;

                return (
                  <AccordionItem
                    key={assignment.id}
                    value={assignment.id}
                    className="border rounded-xl px-4 shadow-sm bg-card overflow-hidden"
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
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={assignment.status === 'COMPLETED' ? 'default' : 'secondary'}
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
                      {/* Кнопка удаления назначения */}
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
                              {deletingId === assignment.user.id ? '...' : t('removeAssignment')}
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
                                {t('removeAssignmentConfirm')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                              <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                <AlertDialogAction
                                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full sm:w-auto"
                                  onClick={() => handleRemoveAssignment(assignment.user.id, false)}
                                >
                                  {t('removeKeepResults')}
                                </AlertDialogAction>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                                  onClick={() => handleRemoveAssignment(assignment.user.id, true)}
                                >
                                  {t('removeWithResults')}
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
                                        (assignment.result!.answers as Record<string, unknown>)[
                                          q.id
                                        ] ?? '—'
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
                                      <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => handleClearComments(assignment.result!.id)}
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
                                              {t('new')}
                                            </Badge>
                                          )}
                                        </div>
                                        <p
                                          className="text-xs text-muted-foreground shrink-0"
                                          suppressHydrationWarning
                                        >
                                          {new Date(comment.createdAt).toLocaleDateString('ru-RU')}
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
                            <div className="flex gap-2 pt-2">
                              <Textarea
                                value={commentText[assignment.result.id] || ''}
                                onChange={e =>
                                  setCommentText(prev => ({
                                    ...prev,
                                    [assignment.result!.id]: e.target.value
                                  }))
                                }
                                placeholder={t('addCommentPlaceholder')}
                                className="resize-y min-h-[80px] flex-1"
                              />
                              <Button
                                onClick={() => handleComment(assignment.result!.id)}
                                disabled={!commentText[assignment.result!.id]?.trim() || loading}
                                size="icon"
                                className="shrink-0 self-end h-10 w-10"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground py-8 text-center bg-muted/20 rounded-lg border border-dashed">
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
        </TabsContent>

        {/* ====================== Вкладка «Редактирование» ====================== */}
        <TabsContent value="edit" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
          <EditSurveyForm
            surveyId={surveyId}
            initialTitle={title}
            initialDescription={description}
            initialQuestions={questions}
          />
        </TabsContent>

        {/* ====================== Вкладка «Предпросмотр» ====================== */}
        <TabsContent
          value="preview"
          className="mt-6 focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-dashed">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Eye className="h-3.5 w-3.5" />
                  {t('previewDesc')}
                </div>
                <CardTitle className="text-xl">{title}</CardTitle>
                {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-6">
                  {questions
                    .sort((a, b) => a.order - b.order)
                    .map((q, i) => (
                      <div key={q.id} className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <div className="flex-1 space-y-2.5">
                            <p className="font-medium text-sm leading-relaxed">{q.text}</p>

                            {/* Рендер формы по типу вопроса */}
                            {q.type === 'SINGLE_CHOICE' && q.options && (
                              <div className="space-y-1.5">
                                {(q.options as string[]).map((opt, oi) => (
                                  <label
                                    key={`${q.id}-opt-${oi}`}
                                    className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-background hover:bg-accent/30 transition-colors cursor-pointer text-sm"
                                  >
                                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                                    {opt}
                                  </label>
                                ))}
                              </div>
                            )}

                            {q.type === 'MULTI_CHOICE' && q.options && (
                              <div className="space-y-1.5">
                                {(q.options as string[]).map((opt, oi) => (
                                  <label
                                    key={`${q.id}-opt-${oi}`}
                                    className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-background hover:bg-accent/30 transition-colors cursor-pointer text-sm"
                                  >
                                    <div className="h-4 w-4 rounded-sm border-2 border-muted-foreground/40 shrink-0" />
                                    {opt}
                                  </label>
                                ))}
                              </div>
                            )}

                            {q.type === 'TEXT' && (
                              <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground italic">
                                {t('textAnswerPlaceholder')}
                              </div>
                            )}

                            {q.type === 'SCALE' && (
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">{t('scaleLabel')}</p>
                                <div className="flex gap-1.5">
                                  {Array.from({ length: 10 }, (_, idx) => idx + 1).map(val => (
                                    <div
                                      key={`${q.id}-scale-${val}`}
                                      className="flex items-center justify-center h-9 w-9 rounded-lg border bg-background text-xs font-medium text-muted-foreground hover:bg-accent/50 transition-colors cursor-pointer"
                                    >
                                      {val}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Тип вопроса */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <QuestionTypeIcon type={q.type} />
                              {t(`type_${q.type}`)}
                            </div>
                          </div>
                        </div>
                        {i < questions.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
