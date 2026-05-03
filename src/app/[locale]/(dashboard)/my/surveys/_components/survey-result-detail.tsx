'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, ShieldCheck, User, CheckCircle2, Clock, Info } from 'lucide-react';
import { addResultComment, markAsReadByUser } from '../actions';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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
 * Улучшенный компонент для отображения результатов опроса.
 * Современная визуализация ответов и чат-интерфейс.
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const [newCommentIds, setNewCommentIds] = useState(() => {
    const ids = new Set<string>();
    comments.forEach(c => {
      if (c.isNew) ids.add(c.id);
    });
    return ids;
  });

  const hasMarkedRead = useRef(false);

  // Скролл вниз при загрузке новых сообщений
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

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
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
      {/* Левая колонка: Ответы */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex flex-col gap-2">
          <Badge
            variant="secondary"
            className="w-fit px-3 py-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Опрос пройден
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight">{surveyTitle}</h2>
          {surveyDescription && (
            <p className="text-muted-foreground text-sm flex items-start gap-2 bg-muted/30 p-3 rounded-lg border italic leading-relaxed">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              {surveyDescription}
            </p>
          )}
        </div>

        <Card className="border-2 shadow-sm">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-xl flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              {t('yourAnswers')}
            </CardTitle>
            <CardDescription>Зафиксированные ответы на момент прохождения</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {questions
                .sort((a, b) => a.order - b.order)
                .map((q, i) => (
                  <div key={q.id} className="p-6 hover:bg-muted/5 transition-colors group">
                    <div className="flex gap-4">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="space-y-3 flex-1">
                        <p className="font-bold text-base leading-snug group-hover:text-primary transition-colors">
                          {q.text}
                        </p>
                        <div className="p-4 rounded-xl bg-muted/40 border border-transparent group-hover:border-border transition-all">
                          {typeof answers[q.id] === 'object' && Array.isArray(answers[q.id]) ? (
                            <div className="flex flex-wrap gap-2">
                              {(answers[q.id] as string[]).map(ans => (
                                <Badge
                                  key={ans}
                                  variant="outline"
                                  className="font-medium border-primary/30 text-primary bg-primary/5 px-2.5 py-0.5"
                                >
                                  {ans}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm font-semibold text-primary/90">
                              {q.type === 'SCALE' ? (
                                <span className="flex items-center gap-1.5">
                                  <span>{String(answers[q.id] ?? '—')}</span>
                                  <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-wider">
                                    из 10
                                  </span>
                                </span>
                              ) : (
                                String(answers[q.id] ?? '—')
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Правая колонка: Чат */}
      <div className="lg:col-span-5 flex flex-col h-[700px] lg:h-auto lg:max-h-[85vh] sticky top-8">
        <Card className="flex-1 flex flex-col border-2 shadow-xl overflow-hidden bg-gradient-to-b from-background to-muted/10">
          <CardHeader className="border-b bg-background/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('commentsTitle')}</CardTitle>
                <CardDescription className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3" />
                  Обычно специалист отвечает в течение дня
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden relative">
            <ScrollArea className="h-full w-full" ref={scrollRef}>
              <div className="p-4 space-y-6">
                {comments.length > 0 ? (
                  comments.map(comment => {
                    const isAdmin = comment.author.role === 'ADMIN';
                    const isMe = comment.author.id === currentUserId;
                    const isNewComment = newCommentIds.has(comment.id);

                    return (
                      <div
                        key={comment.id}
                        className={cn('flex flex-col gap-1.5', isMe ? 'items-end' : 'items-start')}
                      >
                        <div
                          className={cn(
                            'flex items-center gap-2 mb-0.5',
                            isMe ? 'flex-row-reverse' : 'flex-row'
                          )}
                        >
                          <Avatar className="h-6 w-6 border">
                            <AvatarFallback
                              className={cn(
                                'text-[10px] font-bold',
                                isAdmin ? 'bg-orange-500 text-white' : 'bg-primary/20 text-primary'
                              )}
                            >
                              {isAdmin ? 'A' : comment.author.name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">
                            {isAdmin ? 'Специалист' : 'Вы'}
                          </span>
                        </div>

                        <div
                          className={cn(
                            'max-w-[90%] p-3.5 rounded-2xl relative border shadow-sm transition-all duration-500',
                            isMe
                              ? 'bg-primary text-primary-foreground border-transparent rounded-tr-none'
                              : 'bg-background border-border rounded-tl-none',
                            isNewComment &&
                              !isMe &&
                              'ring-2 ring-primary ring-offset-2 animate-pulse'
                          )}
                        >
                          {isNewComment && (
                            <VisibilityObserver
                              onVisible={() => handleCommentVisible(comment.id)}
                              className="absolute -top-6 right-0"
                            >
                              <Badge variant="default" className="text-[8px] px-1.5 py-0">
                                Новое
                              </Badge>
                            </VisibilityObserver>
                          )}
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {comment.text}
                          </p>
                          <p
                            className={cn(
                              'text-[9px] mt-2 opacity-50',
                              isMe ? 'text-right' : 'text-left'
                            )}
                            suppressHydrationWarning
                          >
                            {new Date(comment.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground px-10">
                    <div className="p-4 rounded-full bg-muted/30 mb-4">
                      <MessageSquare className="h-8 w-8 opacity-20" />
                    </div>
                    <p className="text-sm font-medium">{t('noComments')}</p>
                    <p className="text-xs opacity-60 mt-1">
                      Здесь вы можете задать вопрос по результатам этого опроса
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <div className="p-4 border-t bg-background shrink-0 space-y-3">
            <div className="relative group bg-muted/30 rounded-2xl border transition-all focus-within:border-primary/50 focus-within:bg-background">
              <Textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={t('addCommentPlaceholder')}
                className="min-h-[100px] bg-transparent border-none focus-visible:ring-0 resize-none px-4 py-4 text-sm scrollbar-hide"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleSendComment();
                  }
                }}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground/50 font-medium hidden sm:block">
                  Ctrl + Enter
                </span>
                <Button
                  size="icon"
                  onClick={handleSendComment}
                  disabled={!commentText.trim() || loading}
                  className="h-9 w-9 shrink-0 rounded-xl shadow-lg shadow-primary/20 transition-transform active:scale-95"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60 px-1 italic">
              * Специалист получит уведомление о вашем сообщении
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Вспомогательный компонент для заголовка
function ClipboardCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}
