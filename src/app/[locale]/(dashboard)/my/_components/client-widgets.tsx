'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  UserRound,
  StickyNote
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { formatInTimeZone } from 'date-fns-tz';
import { enUS, ru } from 'date-fns/locale';
import { WidgetComponentType } from '@/components/dashboard/dashboard-grid';
import { cn } from '@/lib/utils';

interface MyStatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'accent';
  href?: string;
  isEditing?: boolean;
}

const MyStatCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = 'default',
  href,
  isEditing
}: MyStatCardProps) => {
  const iconClassName =
    tone === 'accent'
      ? 'bg-primary text-primary-foreground shadow-inner'
      : 'bg-primary/10 text-primary';

  const CardWrapper = href && !isEditing ? Link : 'div';

  return (
    <CardWrapper
      href={href || '#'}
      className={cn(
        'block shadow-sm h-full rounded-xl overflow-hidden border border-border/60 transition-all duration-300',
        tone === 'accent' && 'bg-gradient-to-br from-primary/5 via-card to-card border-primary/20',
        !isEditing && href && 'hover:-translate-y-1 hover:shadow-md hover:border-primary/40 group',
        isEditing && 'cursor-default'
      )}
    >
      <Card className="h-full border-0 bg-transparent shadow-none">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            {title}
          </CardTitle>
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl shrink-0 transition-transform',
              iconClassName,
              !isEditing && href && 'group-hover:scale-110'
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/90">{description}</p>
        </CardContent>
      </Card>
    </CardWrapper>
  );
};

// --- WIDGETS ---

export const PendingSurveysWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');
  return (
    <MyStatCard
      title={t('pendingSurveys')}
      value={data?.pendingSurveys ?? '-'}
      description={t('pendingSurveysDesc')}
      icon={ClipboardList}
      tone={data?.pendingSurveys > 0 ? 'accent' : 'default'}
      href="/my/surveys"
      isEditing={isEditing}
    />
  );
};

export const NextSessionWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');
  const userLocale = data?.userLanguage === 'en' ? enUS : ru;

  let formattedNextSession = '—';
  let description = t('nextSessionDesc');

  if (data?.nextSessionStart) {
    const start = new Date(data.nextSessionStart);
    formattedNextSession = formatInTimeZone(start, data.userTimezone || 'UTC', 'd MMM, HH:mm', {
      locale: userLocale
    });
    description =
      data.nextSessionTitle ||
      (data.userLanguage === 'ru' ? 'Консультация запланирована' : 'Consultation scheduled');
  }

  return (
    <MyStatCard
      title={t('nextSession')}
      value={formattedNextSession}
      description={description}
      icon={CalendarDays}
      tone={data?.nextSessionStart ? 'accent' : 'default'}
      href="/my/sessions"
      isEditing={isEditing}
    />
  );
};

export const CompletedSurveysWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');
  return (
    <MyStatCard
      title={t('completedSurveys')}
      value={data?.completedSurveys ?? '-'}
      description={t('completedSurveysDesc')}
      icon={Activity}
      href="/my/surveys"
      isEditing={isEditing}
    />
  );
};

const ActionButton = ({ href, title, description, icon: Icon, isEditing }: any) => (
  <Button
    asChild
    variant="outline"
    disabled={isEditing}
    className={cn(
      'group h-auto w-full justify-between whitespace-normal p-4 rounded-xl border-border/60 transition-all duration-300 hover:border-primary/30 hover:bg-primary/5',
      !isEditing && 'hover:-translate-y-1 hover:shadow-md pointer-events-auto'
    )}
  >
    <Link href={href} className="flex w-full items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-105">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-bold text-foreground/90">{title}</span>
        <span className="mt-0.5 block text-xs font-normal leading-relaxed text-muted-foreground/80">
          {description}
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-1" />
    </Link>
  </Button>
);

export const NextStepsWidget: WidgetComponentType = ({ isEditing }) => {
  const t = useTranslations('My');

  return (
    <Card className="border border-border/50 shadow-sm rounded-xl overflow-hidden h-full flex flex-col">
      <CardHeader className="border-b bg-muted/5 pb-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
          {t('nextStepsTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 p-5 sm:p-6 flex-1">
        <ActionButton
          href="/my/surveys"
          title={t('actionSurveysTitle')}
          description={t('actionSurveysDesc')}
          icon={ClipboardList}
          isEditing={isEditing}
        />
        <ActionButton
          href="/my/sessions"
          title={t('actionSessionsTitle')}
          description={t('actionSessionsDesc')}
          icon={CalendarDays}
          isEditing={isEditing}
        />
        <ActionButton
          href="/my/payments"
          title={t('actionPaymentsTitle')}
          description={t('actionPaymentsDesc')}
          icon={CreditCard}
          isEditing={isEditing}
        />
        <ActionButton
          href="/my/data"
          title={t('actionDataTitle')}
          description={t('actionDataDesc')}
          icon={FileText}
          isEditing={isEditing}
        />
      </CardContent>
    </Card>
  );
};
NextStepsWidget.defaultClassName = 'sm:col-span-2 lg:col-span-2';

export const AccountOverviewWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');

  return (
    <Card className="border border-border/50 shadow-sm rounded-xl overflow-hidden h-full flex flex-col">
      <CardHeader className="border-b bg-muted/5 pb-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
          {t('accountOverviewTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-muted/10 p-3 shadow-inner">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
              {t('profileLabel')}
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground/90 truncate">
              {data?.userName || data?.userEmail || '-'}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/10 p-3 shadow-inner">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
              {t('timezoneLabel')}
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground/90">
              {data?.userTimezone || '-'}
            </div>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          disabled={isEditing}
          className="w-full h-10 rounded-xl font-semibold shadow-sm hover:bg-background pointer-events-auto"
        >
          <Link href="/my/profile">
            <UserRound className="h-4 w-4 mr-2 text-muted-foreground/70" />
            {t('editProfile')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export const BalanceWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');
  return (
    <MyStatCard
      title={t('currentBalance')}
      value={data?.balance != null ? new Intl.NumberFormat().format(data.balance) : '-'}
      description={t('balanceDesc')}
      icon={CreditCard}
      tone={data?.balance > 0 ? 'accent' : 'default'}
      href="/my/payments"
      isEditing={isEditing}
    />
  );
};

export const FilesWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');
  return (
    <MyStatCard
      title={t('myFiles')}
      value={data?.filesCount ?? '-'}
      description={t('filesDesc')}
      icon={FileText}
      href="/my/data"
      isEditing={isEditing}
    />
  );
};

export const NotesWidget: WidgetComponentType = ({ data, isEditing }) => {
  const t = useTranslations('My');
  const [note, setNote] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  const noteKey = `my_dashboard_notes_${data?.userId || 'guest'}`;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    const saved = localStorage.getItem(noteKey);
    if (saved) setNote(saved);
  }, [noteKey]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    localStorage.setItem(noteKey, e.target.value);
  };

  return (
    <Card
      className={cn(
        'border border-border/50 shadow-sm rounded-xl overflow-hidden h-full flex flex-col transition-all duration-300',
        !isEditing && 'pointer-events-auto'
      )}
    >
      <CardHeader className="border-b bg-muted/5 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
            {t('notesTitle')}
          </CardTitle>
          <StickyNote className="h-4 w-4 text-muted-foreground/60" />
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col relative">
        {isMounted ? (
          <Textarea
            value={note}
            onChange={handleChange}
            disabled={isEditing}
            placeholder={t('notesPlaceholder')}
            className="flex-1 w-full h-full min-h-[150px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-transparent p-4 text-sm leading-relaxed"
          />
        ) : (
          <div className="flex-1 w-full min-h-[150px]" />
        )}
      </CardContent>
    </Card>
  );
};
NotesWidget.defaultClassName = 'row-span-2 sm:col-span-2 lg:col-span-1';
