'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, User, CheckCircle2, Clock, Info, Calendar } from 'lucide-react';
import { addResultComment, markAsReadByUser } from '../actions';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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
 * Переработанный компонент для отображения результатов опроса.
 * Концепция "Safe Sanctuary": современная визуализация результатов, премиальный чат-интерфейс,
 * разделители дат, аккуратная верстка.
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

  // Функция для группировки и форматирования дат в чате
  const renderDateSeparator = (currentDateStr: string, prevDateStr?: string) => {
    const current = new Date(currentDateStr);
    const prev = prevDateStr ? new Date(prevDateStr) : null;

    if (prev && current.toDateString() === prev.toDateString()) {
      return null;
    }

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let dateText = '';
    if (current.toDateString() === today.toDateString()) {
      dateText = 'Сегодня';
    } else if (current.toDateString() === yesterday.toDateString()) {
      dateText = 'Вчера';
    } else {
      dateText = current.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }

    return (
      <div className="flex justify-center my-4 animate-in fade-in duration-200">
        <span className="bg-muted px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 shadow-sm border border-border/40">
          {dateText}
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pb-8 px-1 animate-in fade-in duration-500">
      {/* Левая колонка: Ответы */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex flex-col gap-2">
          <Badge
            variant="secondary"
            className="w-fit px-3 py-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Опрос пройден
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight leading-tight">{surveyTitle}</h2>
          {surveyDescription && (
            <p className="text-muted-foreground text-sm flex items-start gap-2 bg-muted/20 p-4 rounded-xl border border-border/40 italic leading-relaxed">
              <Info className="h-4.5 w-4.5 shrink-0 mt-0.5 text-primary" />
              {surveyDescription}
            </p>
          )}
        </div>

        <Card className="border border-border/50 shadow-sm rounded-xl">
          <CardHeader className="border-b bg-muted/5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">{t('yourAnswers')}</CardTitle>
                <CardDescription className="text-xs">
                  Зафиксированные ответы на момент прохождения
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {questions
                .sort((a, b) => a.order - b.order)
                .map((q, i) => (
                  <div
                    key={q.id}
                    className="p-6 hover:bg-muted/5 transition-colors duration-200 group"
                  >
                    <div className="flex gap-4">
                      <span className="flex items-center justify-center h-6 w-6 rounded-lg bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="space-y-3 flex-1 min-w-0">
                        <p className="font-bold text-base leading-snug group-hover:text-primary transition-colors duration-200">
                          {q.text}
                        </p>

                        <div className="p-4 rounded-xl bg-muted/20 border border-border/40 group-hover:border-primary/20 transition-all duration-300">
                          {typeof answers[q.id] === 'object' && Array.isArray(answers[q.id]) ? (
                            <div className="flex flex-wrap gap-2">
                              {(answers[q.id] as string[]).map(ans => (
                                <Badge
                                  key={ans}
                                  variant="outline"
                                  className="font-semibold border-primary/20 text-primary bg-primary/5 px-2.5 py-1 text-xs rounded-lg"
                                >
                                  {ans}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm font-semibold text-foreground/90">
                              {q.type === 'SCALE' ? (
                                <span className="flex items-center gap-1.5">
                                  <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-primary/20 font-bold px-2 py-0.5 text-sm rounded-lg">
                                    {String(answers[q.id] ?? '—')}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-wider">
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
      <div className="lg:col-span-5 flex flex-col h-[650px] lg:h-auto lg:max-h-[85vh] sticky top-6">
        <Card className="flex-1 flex flex-col border border-border/50 shadow-sm overflow-hidden bg-gradient-to-b from-background to-muted/[0.03] rounded-xl">
          <CardHeader className="border-b bg-background/60 backdrop-blur-md shrink-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-lg font-bold">{t('commentsTitle')}</CardTitle>
                <CardDescription className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                  Специалист отвечает в течение дня
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          {/* Лента сообщений */}
          <CardContent className="flex-1 p-0 overflow-hidden relative bg-muted/[0.01]">
            <ScrollArea className="h-full w-full" ref={scrollRef}>
              <div className="p-4 space-y-4">
                {comments.length > 0 ? (
                  comments.map((comment, index) => {
                    const isAdmin = comment.author.role === 'ADMIN';
                    const isMe = comment.author.id === currentUserId;
                    const isNewComment = newCommentIds.has(comment.id);
                    const prevComment = index > 0 ? comments[index - 1] : undefined;

                    return (
                      <div key={comment.id} className="space-y-1">
                        {renderDateSeparator(comment.createdAt, prevComment?.createdAt)}

                        <div
                          className={cn('flex flex-col gap-1', isMe ? 'items-end' : 'items-start')}
                        >
                          {/* Автор */}
                          <div
                            className={cn(
                              'flex items-center gap-1.5 mb-0.5',
                              isMe ? 'flex-row-reverse' : 'flex-row'
                            )}
                          >
                            <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/60">
                              {isAdmin ? 'Специалист' : 'Вы'}
                            </span>
                          </div>

                          {/* Пузырь сообщения */}
                          <div
                            className={cn(
                              'max-w-[85%] p-3.5 rounded-2xl relative border shadow-sm transition-all duration-300 leading-relaxed text-sm',
                              isMe
                                ? 'bg-primary text-primary-foreground border-transparent rounded-tr-none'
                                : 'bg-background border-border/60 text-foreground rounded-tl-none',
                              isNewComment &&
                                !isMe &&
                                'ring-2 ring-primary ring-offset-1 animate-pulse'
                            )}
                          >
                            {isNewComment && (
                              <VisibilityObserver
                                onVisible={() => handleCommentVisible(comment.id)}
                                className="absolute -top-6 right-0"
                              >
                                <Badge
                                  variant="default"
                                  className="text-[8px] px-1.5 py-0 font-bold bg-primary text-primary-foreground"
                                >
                                  Новое
                                </Badge>
                              </VisibilityObserver>
                            )}
                            <p className="whitespace-pre-wrap leading-relaxed text-xs font-medium">
                              {comment.text}
                            </p>

                            <p
                              className={cn(
                                'text-[9px] mt-1.5 opacity-60 font-bold',
                                isMe
                                  ? 'text-right text-primary-foreground/90'
                                  : 'text-left text-muted-foreground/80'
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
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground px-8 space-y-4">
                    <div className="p-4 rounded-full bg-muted/40 text-muted-foreground/30">
                      <MessageSquare className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground/85">{t('noComments')}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                        Здесь вы можете задать вопрос по результатам этого опроса
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          {/* Блок ввода */}
          <div className="p-4 border-t border-border/40 bg-background shrink-0 space-y-2.5">
            <div className="relative bg-muted/10 rounded-2xl border border-border/60 transition-all focus-within:border-primary/50 focus-within:bg-background focus-within:ring-1 focus-within:ring-primary/20">
              <Textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={t('addCommentPlaceholder')}
                className="min-h-[90px] bg-transparent border-none focus-visible:ring-0 resize-none px-4 py-3 text-xs leading-relaxed scrollbar-hide focus:outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleSendComment();
                  }
                }}
              />

              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-3">
                <span className="text-[9px] text-muted-foreground/40 font-bold hidden sm:block">
                  Ctrl + Enter
                </span>
                <Button
                  size="icon"
                  onClick={handleSendComment}
                  disabled={!commentText.trim() || loading}
                  className="h-8 w-8 shrink-0 rounded-xl shadow-md transition-all active:scale-95 bg-primary text-primary-foreground hover:bg-primary-dark"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <p className="text-[9px] text-muted-foreground/60 px-1 italic flex items-center gap-1">
              <Info className="h-3 w-3 text-muted-foreground/45 shrink-0" />
              Специалист получит уведомление о вашем сообщении
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Вспомогательный компонент для иконки ClipboardCheck
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
