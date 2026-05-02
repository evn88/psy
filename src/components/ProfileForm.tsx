'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { signIn } from 'next-auth/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/AlertDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';

interface PasskeyInfo {
  credentialID: string;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports: string | null;
}

interface ProfileFormProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
  passkeys?: PasskeyInfo[];
  isGoogleLinked: boolean;
  googleLinkedAt?: Date | null;
  /** Есть ли у пользователя пароль (credentials) */
  hasPassword: boolean;
  /** Дата последнего входа */
  lastLoginAt?: Date | null;
  /** IP последнего входа */
  lastLoginIp?: string | null;
  /** Таймзона пользователя */
  timezone: string;
  /** Роль пользователя — отображается только для ADMIN */
  role?: string | null;
  /** Email пользователя для отображения куда придёт письмо */
  userEmail: string;
}

/**
 * Единая форма управления профилем пользователя.
 * Используется как в личном кабинете, так и в админ-панели.
 * Позволяет обновлять имя, управлять passkeys, Google-привязкой, паролем, удалить аккаунт.
 */
export const ProfileForm = ({
  user,
  passkeys: initialPasskeys,
  isGoogleLinked: initialIsGoogleLinked,
  googleLinkedAt,
  hasPassword,
  lastLoginAt,
  lastLoginIp,
  timezone: initialTimezone,
  role,
  userEmail
}: ProfileFormProps) => {
  const t = useTranslations('Profile');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user.name || '');
  const [timezone, setTimezone] = useState(initialTimezone || 'UTC');
  const [isGoogleLinked, setIsGoogleLinked] = useState(initialIsGoogleLinked);
  const [showAlertOpen, setShowAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '' });

  // Доступные таймзоны
  const timezones = Intl.supportedValuesOf('timeZone');

  // Состояние формы смены пароля
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Состояние управления passkeys
  const safeInitialPasskeys = Array.isArray(initialPasskeys) ? initialPasskeys : [];
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>(safeInitialPasskeys);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [showDeletePasskeysConfirm, setShowDeletePasskeysConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Состояние удаления аккаунта
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);

  const profileFallbacks = {
    passkeysTitle: 'Passkeys',
    passkeysDescription: 'Защитите аккаунт с помощью passkey.',
    clearPasskeys: 'Удалить Passkeys',
    clearPasskeysConfirmTitle: 'Вы уверены?',
    clearPasskeysConfirmDescription:
      'Это действие нельзя отменить. Все сохранённые passkeys будут удалены навсегда. Вы больше не сможете войти с их помощью.',
    deletePasskeys: 'Удалить Passkeys',
    createPasskey: 'Создать Passkey',
    passkeyAlreadyRegistered:
      'На этом устройстве passkey уже зарегистрирован. Удалите существующий passkey или используйте другое устройство либо ключ безопасности.',
    passkeyCreateCancelled: 'Создание passkey было отменено.',
    passkeyDomainMismatch:
      'Домен приложения не совпадает с настройками passkey. Откройте сайт по тому же адресу, для которого выполняется регистрация.',
    passkeyTypePlatform: 'Биометрический ключ (Touch ID / Face ID / Windows Hello)',
    passkeyTypePlatformSynced: 'Синхронизированный биометрический ключ',
    passkeyTypeUsb: 'USB-ключ безопасности',
    passkeyTypeHybrid: 'Мобильное устройство',
    passkeyTypeNfc: 'NFC-ключ',
    passkeyTypeDefault: 'Passkey',
    passkeyTypeSynced: 'Синхронизированный',
    passkeyDeleteOne: 'Удалить',
    passkeyDeleteOneConfirmTitle: 'Удалить этот passkey?',
    passkeyDeleteOneConfirmDescription:
      'Этот passkey будет удалён навсегда. Вы не сможете войти с его помощью.'
  } as const;

  /**
   * Показывает информационный диалог.
   */
  const showAlert = (title: string, message: string) => {
    setAlertConfig({ title, message });
    setShowAlertOpen(true);
  };

  /**
   * Возвращает перевод с безопасным fallback для ключей, которые могут отсутствовать в сообщениях.
   * @param key - ключ перевода.
   * @returns Локализованная строка или fallback.
   */
  const getProfileText = (key: keyof typeof profileFallbacks): string => {
    return t.has(key) ? t(key) : profileFallbacks[key];
  };

  /**
   * Загружает актуальный список passkeys из API профиля.
   */
  const fetchPasskeys = async (): Promise<void> => {
    try {
      const response = await fetch('/api/profile/passkeys', {
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { passkeys?: PasskeyInfo[] };
      setPasskeys(Array.isArray(data.passkeys) ? data.passkeys : []);
    } catch (error) {
      console.error('Failed to fetch passkeys:', error);
    }
  };

  /**
   * Синхронизирует локальное состояние passkeys с актуальными server props после router.refresh()
   * и затем запрашивает серверное состояние из того же API-контекста, что используется для WebAuthn.
   */
  useEffect(() => {
    setPasskeys(Array.isArray(initialPasskeys) ? initialPasskeys : []);
    void fetchPasskeys();
  }, [initialPasskeys]);

  /**
   * Возвращает понятное сообщение об ошибке регистрации passkey.
   * @param error - исходная ошибка WebAuthn/browser API.
   * @returns Локализованное сообщение для пользователя.
   */
  const getPasskeyCreateErrorMessage = (error: unknown): string => {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = String(error.code);

      if (code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') {
        return getProfileText('passkeyAlreadyRegistered');
      }

      if (code === 'ERROR_CEREMONY_ABORTED') {
        return getProfileText('passkeyCreateCancelled');
      }

      if (code === 'ERROR_INVALID_DOMAIN' || code === 'ERROR_INVALID_RP_ID') {
        return getProfileText('passkeyDomainMismatch');
      }
    }

    if (error instanceof Error) {
      if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
        return getProfileText('passkeyCreateCancelled');
      }

      return error.message || t('passkeyCreateFailed');
    }

    return t('passkeyCreateFailed');
  };

  /**
   * Обрабатывает сохранение имени пользователя.
   */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        body: JSON.stringify({ name, timezone }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        router.refresh();
        showAlert(t('successTitle'), t('successTitle'));
      } else {
        showAlert(t('errorTitle'), t('updateFailed'));
      }
    } catch {
      showAlert(t('errorTitle'), t('updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Обрабатывает смену пароля.
   */
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);

    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        setCurrentPassword('');
        setNewPassword('');
        setShowPasswordForm(false);
        showAlert(t('successTitle'), t('passwordChangeSuccess'));
      } else {
        const data = await res.json();
        showAlert(
          t('errorTitle'),
          data.message === 'Current password is incorrect'
            ? t('passwordCurrentIncorrect')
            : t('passwordChangeFailed')
        );
      }
    } catch {
      showAlert(t('errorTitle'), t('passwordChangeFailed'));
    } finally {
      setPasswordLoading(false);
    }
  };

  /**
   * Инициирует привязку Google аккаунта.
   */
  const handleLinkGoogle = async () => {
    setLoading(true);
    await signIn('google', { callbackUrl: window.location.href });
  };

  /**
   * Обрабатывает отвязку Google аккаунта.
   */
  const handleUnlinkGoogle = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile/google/unlink', {
        method: 'DELETE'
      });
      if (res.ok) {
        setIsGoogleLinked(false);
        showAlert(t('successTitle'), t('googleUnlinkSuccess'));
      } else {
        showAlert(t('errorTitle'), t('googleError'));
      }
    } catch {
      showAlert(t('errorTitle'), t('googleError'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Создаёт новый passkey через WebAuthn.
   */
  const handleCreatePasskey = async () => {
    setPasskeyLoading(true);
    try {
      const optRes = await fetch('/api/profile/passkeys/register/options');
      if (!optRes.ok) {
        const errorData = (await optRes.json().catch(() => null)) as { error?: string } | null;
        showAlert(t('errorTitle'), errorData?.error || t('passkeyCreateFailed'));
        return;
      }
      const options = await optRes.json();
      const attestation = await startRegistration(options);
      const verRes = await fetch('/api/profile/passkeys/register/verify', {
        method: 'POST',
        body: JSON.stringify(attestation),
        headers: { 'Content-Type': 'application/json' }
      });
      if (verRes.ok) {
        await fetchPasskeys();
        router.refresh();
        showAlert(t('successTitle'), t('passkeySuccess'));
      } else {
        const errorData = (await verRes.json().catch(() => null)) as { error?: string } | null;
        showAlert(t('errorTitle'), errorData?.error || t('passkeyVerifyFailed'));
      }
    } catch (error) {
      console.error('Passkey registration failed:', error);
      showAlert(t('errorTitle'), getPasskeyCreateErrorMessage(error));
    } finally {
      setPasskeyLoading(false);
    }
  };

  /**
   * Удаляет все passkeys пользователя.
   */
  const handleDeletePasskeys = async () => {
    setPasskeyLoading(true);
    try {
      const res = await fetch('/api/profile/passkeys', { method: 'DELETE' });
      if (res.ok) {
        await fetchPasskeys();
        showAlert(t('successTitle'), t('clearSuccess'));
      } else {
        showAlert(t('errorTitle'), t('clearFailed'));
      }
    } catch {
      showAlert(t('errorTitle'), t('clearError'));
    } finally {
      setPasskeyLoading(false);
      setShowDeletePasskeysConfirm(false);
    }
  };

  /**
   * Удаляет один passkey по credentialID.
   */
  const handleDeleteSinglePasskey = async (credentialId: string) => {
    setPasskeyLoading(true);
    try {
      const res = await fetch(`/api/profile/passkeys?id=${encodeURIComponent(credentialId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchPasskeys();
        showAlert(t('successTitle'), t('passkeyDeleteOneSuccess'));
      } else {
        showAlert(t('errorTitle'), t('passkeyDeleteOneFailed'));
      }
    } catch {
      showAlert(t('errorTitle'), t('passkeyDeleteOneFailed'));
    } finally {
      setPasskeyLoading(false);
      setPendingDeleteId(null);
    }
  };

  /**
   * Возвращает читаемое название типа passkey по его характеристикам.
   */
  const getPasskeyLabel = (passkey: PasskeyInfo): string => {
    const transports = passkey.transports?.split(',') ?? [];
    if (transports.includes('internal')) {
      return passkey.credentialBackedUp
        ? getProfileText('passkeyTypePlatformSynced')
        : getProfileText('passkeyTypePlatform');
    }
    if (transports.includes('usb')) return getProfileText('passkeyTypeUsb');
    if (transports.includes('hybrid')) return getProfileText('passkeyTypeHybrid');
    if (transports.includes('nfc')) return getProfileText('passkeyTypeNfc');
    return passkey.credentialDeviceType === 'multiDevice'
      ? getProfileText('passkeyTypeSynced')
      : getProfileText('passkeyTypeDefault');
  };

  /**
   * Отправляет запрос на удаление аккаунта — пользователь получит письмо со ссылкой.
   */
  const handleRequestAccountDeletion = async () => {
    setDeleteAccountLoading(true);
    try {
      const res = await fetch('/api/profile/delete-request', { method: 'POST' });
      if (res.ok) {
        showAlert(t('successTitle'), t('deleteAccountEmailSent'));
      } else {
        const data = await res.json();
        if (data.error === 'admin_cannot_self_delete') {
          showAlert(t('errorTitle'), t('deleteAccountAdminError'));
        } else if (data.error === 'has_blog_posts') {
          showAlert(t('errorTitle'), t('deleteAccountHasBlogPosts'));
        } else {
          showAlert(t('errorTitle'), t('deleteAccountFailed'));
        }
      }
    } catch {
      showAlert(t('errorTitle'), t('deleteAccountFailed'));
    } finally {
      setDeleteAccountLoading(false);
      setShowDeleteAccountConfirm(false);
    }
  };

  /**
   * Форматирует дату Google привязки.
   */
  const formatGoogleLinkedDate = (date: Date | null | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    }).format(d);
  };

  /**
   * Форматирует дату последнего входа.
   */
  const formatLastLogin = (date: Date | null | undefined): string => {
    if (!date) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    }).format(new Date(date));
  };

  return (
    <>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="name">{t('nameLabel')}</Label>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">{t('emailLabel')}</Label>
          <Input id="email" value={user.email || ''} disabled className="bg-muted" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="timezone">{t('timezoneLabel')}</Label>
          <Select value={timezone} onValueChange={setTimezone} disabled={loading}>
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select a timezone" />
            </SelectTrigger>
            <SelectContent>
              {timezones.map(tz => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t('timezoneDescription')}</p>
        </div>

        <Button
          type="submit"
          disabled={loading || (name === user.name && timezone === initialTimezone)}
        >
          {loading ? t('saving') : t('save')}
        </Button>

        {/* Роль — только для ADMIN */}
        {role === 'ADMIN' && (
          <>
            <Separator />
            <div className="flex items-center gap-2">
              <Label>{t('roleLabel')}</Label>
              <Badge variant="secondary">ADMIN</Badge>
            </div>
          </>
        )}

        {/* Последний вход */}
        {lastLoginAt && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>{t('lastLoginTitle')}</Label>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  {t('lastLoginDate')}: {formatLastLogin(lastLoginAt)}
                </div>
                {lastLoginIp && (
                  <div>
                    IP: <span className="font-mono text-xs">{lastLoginIp}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Смена пароля — только для credentials */}
        {hasPassword && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('passwordTitle')}</Label>
                {!showPasswordForm && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordForm(true)}
                  >
                    {t('changePassword')}
                  </Button>
                )}
              </div>
              {showPasswordForm && (
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="grid gap-2">
                    <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      disabled={passwordLoading}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="newPassword">{t('newPassword')}</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      disabled={passwordLoading}
                      minLength={6}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={passwordLoading || !currentPassword || !newPassword}
                      onClick={handlePasswordChange}
                    >
                      {passwordLoading ? t('saving') : t('save')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setCurrentPassword('');
                        setNewPassword('');
                      }}
                    >
                      {t('cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Google аккаунт */}
        <Separator />
        <div>
          <Label>{t('googleAccount')}</Label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-border p-4 bg-card mt-2">
            <div className="space-y-0.5">
              <div className="font-medium">{t('googleAccount')}</div>
              <div className="text-sm text-muted-foreground">{t('googleAccountDescription')}</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {isGoogleLinked ? (
                <Button
                  variant="destructive"
                  type="button"
                  onClick={handleUnlinkGoogle}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  {t('unlinkGoogle')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleLinkGoogle}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  {t('linkGoogle')}
                </Button>
              )}
            </div>
          </div>
          {isGoogleLinked && googleLinkedAt && (
            <div className="text-sm text-muted-foreground mt-2">
              {t('linkedToGoogle', { date: formatGoogleLinkedDate(googleLinkedAt) })}
            </div>
          )}
        </div>

        {/* Passkeys */}
        <Separator />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{getProfileText('passkeysTitle')}</Label>
            <div className="flex gap-2">
              {passkeys.length > 0 && (
                <Button
                  variant="destructive"
                  type="button"
                  size="sm"
                  onClick={() => setShowDeletePasskeysConfirm(true)}
                  disabled={passkeyLoading}
                >
                  {getProfileText('clearPasskeys')}
                </Button>
              )}
              <Button
                variant="outline"
                type="button"
                size="sm"
                onClick={handleCreatePasskey}
                disabled={passkeyLoading}
              >
                {getProfileText('createPasskey')}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{getProfileText('passkeysDescription')}</p>
          {passkeys.length > 0 && (
            <div className="space-y-2">
              {passkeys.map(passkey => (
                <div
                  key={passkey.credentialID}
                  className="flex items-center justify-between rounded-lg border border-border p-3 bg-card"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-sm font-medium">{getPasskeyLabel(passkey)}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {passkey.credentialID.slice(0, 16)}…
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    type="button"
                    size="sm"
                    onClick={() => setPendingDeleteId(passkey.credentialID)}
                    disabled={passkeyLoading}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 ml-2"
                  >
                    {getProfileText('passkeyDeleteOne')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Опасная зона — удаление аккаунта */}
        <Separator />
        <div className="rounded-lg border border-destructive/50 p-4 space-y-3">
          <div>
            <Label className="text-destructive">{t('deleteAccountTitle')}</Label>
            <p className="text-sm text-muted-foreground mt-1">{t('deleteAccountDescription')}</p>
          </div>
          <Button
            variant="destructive"
            type="button"
            onClick={() => setShowDeleteAccountConfirm(true)}
            disabled={deleteAccountLoading}
          >
            {t('deleteAccountButton')}
          </Button>
        </div>
      </form>

      {/* Диалог информации */}
      <AlertDialog open={showAlertOpen} onOpenChange={setShowAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertConfig.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertConfig.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAlertOpen(false)}>{t('ok')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог подтверждения удаления passkeys */}
      <AlertDialog open={showDeletePasskeysConfirm} onOpenChange={setShowDeletePasskeysConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getProfileText('clearPasskeysConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {getProfileText('clearPasskeysConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeletePasskeysConfirm(false)}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePasskeys}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {getProfileText('deletePasskeys')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог подтверждения удаления одного passkey */}
      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={open => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getProfileText('passkeyDeleteOneConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {getProfileText('passkeyDeleteOneConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDeleteId(null)}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDeleteId && handleDeleteSinglePasskey(pendingDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {getProfileText('passkeyDeleteOne')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог подтверждения удаления аккаунта */}
      <AlertDialog open={showDeleteAccountConfirm} onOpenChange={setShowDeleteAccountConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteAccountConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteAccountConfirmDescription')}{' '}
              <span className="font-medium">{userEmail}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteAccountConfirm(false)}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRequestAccountDeletion}
              disabled={deleteAccountLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('deleteAccountConfirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
