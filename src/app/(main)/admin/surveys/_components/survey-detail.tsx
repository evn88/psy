'use client';

import { useState } from 'react';
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
import { UserPlus, CheckCircle2, Clock, MessageSquare, Send } from 'lucide-react';
import { assignSurvey, addComment } from '../actions';
import { useTranslations } from 'next-intl';

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

/**
 * Компонент управления опросом: назначение пользователей, просмотр результатов, комментирование.
 */
export const SurveyDetail = ({
  surveyId,
  title,
  description,
  questions,
  assignments,
  allUsers
}: SurveyDetailProps) => {
  const t = useTranslations('AdminSurveys');
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const assignedUserIds = assignments.map(a => a.user.id);
  const unassignedUsers = allUsers.filter(u => !assignedUserIds.includes(u.id));

  /** Назначает опрос выбранному пользователю */
  const handleAssign = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    await assignSurvey(surveyId, selectedUserId);
    setSelectedUserId('');
    setLoading(false);
    router.refresh();
  };

  /** Добавляет комментарий к результату */
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
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>

      {/* Вопросы опроса */}
      <Card>
        <CardHeader>
          <CardTitle>{t('questions')}</CardTitle>
          <CardDescription>{t('questionsCount', { count: questions.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {questions
              .sort((a, b) => a.order - b.order)
              .map((q, i) => (
                <div key={q.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground font-medium shrink-0">{i + 1}.</span>
                  <div>
                    <p className="font-medium">{q.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`type_${q.type}`)}
                      {q.options && <span> · {(q.options as string[]).join(', ')}</span>}
                    </p>
                  </div>
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
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="sm:w-[300px]">
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
            <Button onClick={handleAssign} disabled={!selectedUserId || loading}>
              {t('assign')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Результаты */}
      <Card>
        <CardHeader>
          <CardTitle>{t('results')}</CardTitle>
          <CardDescription>{t('resultsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('noAssignments')}</p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {assignments.map(assignment => (
                <AccordionItem key={assignment.id} value={assignment.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2 text-left">
                      <span className="font-medium">
                        {assignment.user.name || assignment.user.email}
                      </span>
                      <Badge
                        variant={assignment.status === 'COMPLETED' ? 'default' : 'secondary'}
                        className="shrink-0"
                      >
                        {assignment.status === 'COMPLETED' ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {t('completed')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t('pending')}
                          </span>
                        )}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {assignment.result ? (
                      <div className="space-y-4 pl-2">
                        {/* Ответы */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">{t('answers')}</h4>
                          {questions
                            .sort((a, b) => a.order - b.order)
                            .map(q => (
                              <div key={q.id} className="p-2 rounded bg-muted/30 text-sm">
                                <p className="font-medium">{q.text}</p>
                                <p className="text-muted-foreground mt-1">
                                  {JSON.stringify(
                                    (assignment.result!.answers as Record<string, unknown>)[q.id] ??
                                      '—'
                                  )}
                                </p>
                              </div>
                            ))}
                        </div>

                        <Separator />

                        {/* Комментарии */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {t('comments')}
                          </h4>
                          {assignment.result.comments.length > 0 ? (
                            assignment.result.comments.map(comment => (
                              <div key={comment.id} className="p-2 rounded border bg-card text-sm">
                                <p>{comment.text}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {comment.author.name || 'User'} ·{' '}
                                  {new Date(comment.createdAt).toLocaleDateString('ru-RU')}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">{t('noComments')}</p>
                          )}

                          {/* Добавить комментарий */}
                          <div className="flex gap-2 mt-2">
                            <Textarea
                              value={commentText[assignment.result.id] || ''}
                              onChange={e =>
                                setCommentText(prev => ({
                                  ...prev,
                                  [assignment.result!.id]: e.target.value
                                }))
                              }
                              placeholder={t('addCommentPlaceholder')}
                              className="min-h-[60px]"
                            />
                            <Button
                              size="icon"
                              onClick={() => handleComment(assignment.result!.id)}
                              disabled={!commentText[assignment.result!.id]?.trim() || loading}
                              className="shrink-0 self-end"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground pl-2">{t('notCompleted')}</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
