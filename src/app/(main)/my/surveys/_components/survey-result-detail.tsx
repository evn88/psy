'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, User, ShieldCheck } from 'lucide-react';
import { addResultComment, markAsReadByUser } from '../actions';
import { useTranslations } from 'next-intl';

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

interface SurveyQuestion {
  id: string;
  text: string;
  type: string;
  options: string[] | null;
  order: number;
}

interface SurveyComment {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; name: string | null; role: string };
  isNew?: boolean;
}

interface SurveyResultDetailProps {
  resultId: string;
  surveyTitle: string;
  surveyDescription: string | null;
  questions: SurveyQuestion[];
  answers: Record<string, unknown>;
  comments: SurveyComment[];
  currentUserId: string;
}

/**
 * Компонент для отображения результатов опроса пользователю.
 * Позволяет видеть свои ответы и вести диалог с администратором.
 */
export const SurveyResultDetail = ({
  resultId,
  surveyTitle,
  surveyDescription,
  questions,
  answers,
  comments,
  currentUserId
}: SurveyResultDetailProps) => {
  const t = useTranslations('Surveys');
  const router = useRouter();
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);

  const [newCommentIds, setNewCommentIds] = useState(() => {
    const ids = new Set<string>();
    comments.forEach(c => {
      if (c.isNew) ids.add(c.id);
    });
    return ids;
  });

  const hasMarkedRead = useRef(false);

  const handleCommentVisible = useCallback(
    (commentId: string) => {
      if (!hasMarkedRead.current) {
        markAsReadByUser(resultId);
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
    [resultId]
  );

  /** Отправляет новый комментарий (ответ администратору) */
  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setLoading(true);
    const result = await addResultComment(resultId, commentText);
    if (result.success) {
      setCommentText('');
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">{surveyTitle}</h2>
        {surveyDescription && <p className="text-muted-foreground">{surveyDescription}</p>}
      </div>

      {/* Секция с ответами пользователя */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('yourAnswers')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions
            .sort((a, b) => a.order - b.order)
            .map((q, i) => (
              <div key={q.id} className="space-y-1.5 p-3 rounded-lg border bg-muted/30">
                <p className="font-semibold text-sm">
                  {i + 1}. {q.text}
                </p>
                <div className="text-sm text-primary font-medium">
                  {typeof answers[q.id] === 'object' && Array.isArray(answers[q.id])
                    ? (answers[q.id] as string[]).join(', ')
                    : String(answers[q.id] ?? '—')}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Секция комментариев / чат */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {t('commentsTitle')}
        </h3>

        <div className="space-y-4">
          {comments.length > 0 ? (
            comments.map(comment => {
              const isAdmin = comment.author.role === 'ADMIN';
              const isMe = comment.author.id === currentUserId;
              const isNewComment = newCommentIds.has(comment.id);

              const commentContent = (
                <div
                  className={`max-w-[85%] p-3 rounded-2xl relative border transition-all duration-500 ${
                    isNewComment
                      ? `bg-primary/10 text-foreground border-primary shadow-sm ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`
                      : isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-none border-transparent'
                        : 'bg-muted rounded-tl-none border-border'
                  }`}
                >
                  <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-4 mb-1.5 opacity-80 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isAdmin ? (
                        <ShieldCheck className="h-3 w-3 shrink-0" />
                      ) : (
                        <User className="h-3 w-3 shrink-0" />
                      )}
                      <span className="text-[10px] uppercase font-bold tracking-wider truncate">
                        {isAdmin ? 'Admin' : comment.author.name || 'User'}
                      </span>
                    </div>
                    {isNewComment && (
                      <Badge
                        variant="default"
                        className="text-[9px] h-4 px-1.5 py-0 uppercase tracking-wider shrink-0"
                      >
                        Новое
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{comment.text}</p>
                  <p className="text-[10px] mt-2 opacity-60 text-right" suppressHydrationWarning>
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
              );

              return (
                <div
                  key={comment.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  {isNewComment ? (
                    <VisibilityObserver onVisible={() => handleCommentVisible(comment.id)}>
                      {commentContent}
                    </VisibilityObserver>
                  ) : (
                    commentContent
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">{t('noComments')}</p>
            </div>
          )}
        </div>

        {/* Форма ответа */}
        <div className="flex gap-2 items-start bg-card p-3 rounded-xl border shadow-sm">
          <Textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder={t('addCommentPlaceholder')}
            className="min-h-[80px] bg-transparent border-none focus-visible:ring-0 resize-none p-0"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSendComment();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleSendComment}
            disabled={!commentText.trim() || loading}
            className="h-10 w-10 shrink-0 rounded-full shadow-md"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          Ctrl+Enter для быстрой отправки
        </p>
      </div>
    </div>
  );
};
