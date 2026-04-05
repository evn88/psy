'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ClipboardList, ExternalLink, MessageSquare, Search } from 'lucide-react';

interface SurveyRow {
  id: string;
  title: string;
  description: string | null;
  questionsCount: number;
  assignmentsCount: number;
  createdByName: string;
  createdAt: string;
  hasUnreadMessages: boolean;
}

interface SurveysTableProps {
  surveys: SurveyRow[];
}

/**
 * Клиентский компонент таблицы опросов с поиском.
 * Поддерживает фильтрацию по названию и навигацию к деталям.
 */
export const SurveysTable = ({ surveys }: SurveysTableProps) => {
  const t = useTranslations('AdminSurveys');
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = surveys.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));

  /** Переход к странице детализации опроса */
  const navigateToSurvey = (id: string) => {
    router.push(`/admin/surveys/${id}`);
  };

  if (surveys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-border bg-muted/20">
        <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-5">
          <ClipboardList className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">{t('noSurveys')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Поиск и счётчик */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchSurveys')}
            className="pl-9 h-9"
          />
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {t('totalSurveys', { count: filtered.length })}
        </span>
      </div>

      {/* Таблица (десктоп) */}
      <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold">{t('surveyName')}</TableHead>
              <TableHead className="w-[100px] text-center font-semibold">
                {t('questionsShort')}
              </TableHead>
              <TableHead className="w-[110px] text-center font-semibold">
                {t('assignmentsShort')}
              </TableHead>
              <TableHead className="w-[140px] font-semibold">{t('author')}</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Search className="h-5 w-5 mx-auto mb-2 opacity-50" />
                  {t('noResults')}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(survey => (
                <TableRow
                  key={survey.id}
                  className="cursor-pointer group transition-colors"
                  onClick={() => navigateToSurvey(survey.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate block group-hover:text-primary transition-colors">
                            {survey.title}
                          </span>
                          {survey.hasUnreadMessages && (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                            </span>
                          )}
                        </div>
                        {survey.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-[400px]">
                            {survey.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono text-xs tabular-nums">
                      {survey.questionsCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                      {survey.assignmentsCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground truncate block">
                      {survey.createdByName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => {
                        e.stopPropagation();
                        navigateToSurvey(survey.id);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Карточки (мобильный) */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <Search className="h-5 w-5 mx-auto mb-2 opacity-50" />
            {t('noResults')}
          </div>
        ) : (
          filtered.map(survey => (
            <button
              key={survey.id}
              type="button"
              onClick={() => navigateToSurvey(survey.id)}
              className="w-full text-left p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{survey.title}</span>
                    {survey.hasUnreadMessages && (
                      <MessageSquare className="h-3.5 w-3.5 text-destructive shrink-0" />
                    )}
                  </div>
                  {survey.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {survey.description}
                    </p>
                  )}
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {t('questionsCount', { count: survey.questionsCount })}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {t('assignmentsCount', { count: survey.assignmentsCount })}
                </Badge>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {survey.createdByName}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
