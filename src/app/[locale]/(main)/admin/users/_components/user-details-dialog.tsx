'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Clock, Globe, LogIn, MapPin, Palette, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type AppLocale } from '@/i18n/config';
import type { AdminUserData } from './types';

/** Названия языков для отображения в интерфейсе */
const LANGUAGE_NAMES: Record<AppLocale, string> = {
  ru: 'Русский',
  en: 'English',
  sr: 'Srpski'
};

interface UserDetailsDialogProps {
  user: AdminUserData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Форматирует дату в локализованную строку с временем.
 * @param date - дата для форматирования
 * @returns строка даты или '—'
 */
const formatDateTime = (date: Date | null): string => {
  if (!date) return '—';
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Модальное окно с полной информацией о пользователе.
 * Показывает все данные кроме пароля: ID, имя, email, роль,
 * статус верификации, язык, тема, даты, IP, история входов.
 */
export const UserDetailsDialog = ({ user, open, onOpenChange }: UserDetailsDialogProps) => {
  const t = useTranslations('Admin');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{t('userDetailsTitle')}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Основная информация */}
          <section>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t('detailsBasicInfo')}
            </h4>
            <div className="grid grid-cols-[140px_1fr] gap-y-2.5 text-sm">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded break-all">
                {user.id}
              </span>

              <span className="text-muted-foreground">{t('nameLabel')}</span>
              <span>{user.name || t('noName')}</span>

              <span className="text-muted-foreground">{t('emailLabel')}</span>
              <span>{user.email}</span>

              <span className="text-muted-foreground">{t('roleLabel')}</span>
              <Badge
                variant={
                  user.role === 'ADMIN' ? 'default' : user.role === 'USER' ? 'outline' : 'secondary'
                }
                className="w-fit"
              >
                {user.role}
              </Badge>

              <span className="text-muted-foreground">{t('providerColumn')}</span>
              <div className="flex gap-1 flex-wrap">
                {user.providers.length > 0 ? (
                  user.providers.map(p => (
                    <Badge key={p} variant="outline" className="text-xs">
                      {p === 'google' ? 'Google' : p === 'credentials' ? 'Email' : p}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-xs">
                    {user.registrationProvider === 'credentials'
                      ? 'Email'
                      : user.registrationProvider}
                  </Badge>
                )}
              </div>

              <span className="text-muted-foreground">{t('detailsImage')}</span>
              <span>{user.image || '—'}</span>
            </div>
          </section>

          <Separator />

          {/* Статус аккаунта */}
          <section>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t('detailsAccountStatus')}
            </h4>
            <div className="grid grid-cols-[140px_1fr] gap-y-2.5 text-sm">
              <span className="text-muted-foreground">{t('verifiedColumn')}</span>
              <div className="flex items-center gap-1.5">
                {user.emailVerified || user.registrationProvider === 'google' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>
                      {user.emailVerified
                        ? formatDateTime(user.emailVerified)
                        : t('verifiedViaGoogle')}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>{t('notVerified')}</span>
                  </>
                )}
              </div>

              <span className="text-muted-foreground">{t('detailsAccountActive')}</span>
              <div>
                {user.isDisabled ? (
                  <Badge variant="destructive">{t('disabled')}</Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {t('active')}
                  </Badge>
                )}
              </div>

              <span className="text-muted-foreground">{t('statusColumn')}</span>
              <div>
                {user.isOnline ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {t('online')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500">
                    {t('offline')}
                  </Badge>
                )}
              </div>
            </div>
          </section>

          <Separator />

          {/* Настройки */}
          <section>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t('detailsPreferences')}
            </h4>
            <div className="grid grid-cols-[140px_1fr] gap-y-2.5 text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                {t('detailsLanguage')}
              </span>
              <span>{LANGUAGE_NAMES[user.language as AppLocale] || 'Unknown'}</span>

              <span className="text-muted-foreground flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                {t('detailsTheme')}
              </span>
              <span className="capitalize">{user.theme}</span>

              <span className="text-muted-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                {t('timezoneLabel')}
              </span>
              <span>{user.timezone || 'UTC'}</span>
            </div>
          </section>

          <Separator />

          {/* Даты и IP */}
          <section>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t('detailsDatesAndIp')}
            </h4>
            <div className="grid grid-cols-[140px_1fr] gap-y-2.5 text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {t('detailsCreatedAt')}
              </span>
              <span>{formatDateTime(user.createdAt)}</span>

              <span className="text-muted-foreground">{t('detailsUpdatedAt')}</span>
              <span>{formatDateTime(user.updatedAt)}</span>

              <span className="text-muted-foreground">{t('lastSeenColumn')}</span>
              <span>{formatDateTime(user.lastSeen)}</span>

              <span className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {t('detailsRegIp')}
              </span>
              <span className="font-mono text-xs">{user.registrationIp || '—'}</span>
            </div>
          </section>

          {/* История входов */}
          {user.loginHistory.length > 0 && (
            <>
              <Separator />
              <section>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <LogIn className="h-3.5 w-3.5" />
                  {t('detailsLoginHistory')}
                </h4>
                <div className="space-y-2">
                  {user.loginHistory.map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          {entry.provider === 'google'
                            ? 'Google'
                            : entry.provider === 'credentials'
                              ? 'Email'
                              : entry.provider}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {entry.ip || '—'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
