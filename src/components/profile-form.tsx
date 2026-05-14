'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';
import { Clock, Fingerprint, KeyRound, Mail, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

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

interface ProfileSectionProps {
  title: string;
  description?: string;
  icon: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  variant?: 'default' | 'danger';
}

interface StatusItemProps {
  label: string;
  value: ReactNode;
}

const ProfileSection = ({
  title,
  description,
  icon,
  actions,
  children,
  variant = 'default'
}: ProfileSectionProps) => {
  const borderClass = variant === 'danger' ? 'border-destructive/40' : 'border-border';

  return (
    <section className={`rounded-lg border ${borderClass} bg-card text-card-foreground shadow-sm`}>
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-semibold leading-6">{title}</h2>
            {description && (
              <p className="text-sm leading-5 text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{actions}</div>
        )}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
};

const StatusItem = ({ label, value }: StatusItemProps) => (
  <div className="rounded-lg border border-border bg-background p-3">
    <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
    <div className="mt-1 min-w-0 break-words text-sm font-medium">{value}</div>
  </div>
);

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

  const hasProfileChanges = name !== (user.name || '') || timezone !== initialTimezone;

  const handleCancelProfileChanges = () => {
    setName(user.name || '');
    setTimezone(initialTimezone);
  };

  return (
    <>
      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <ProfileSection
            title={t('personalDataTitle')}
            description={t('personalDataDescription')}
            icon={<UserRound className="h-5 w-5" aria-hidden />}
            actions={
              hasProfileChanges && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancelProfileChanges}
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                  >
                    {loading ? t('saving') : t('save')}
                  </Button>
                </>
              )
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('nameLabel')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={loading}
                  autoComplete="name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">{t('emailLabel')}</Label>
                <Input
                  id="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted"
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="timezone">{t('timezoneLabel')}</Label>
                <Select value={timezone} onValueChange={setTimezone} disabled={loading}>
                  <SelectTrigger id="timezone" className="w-full">
                    <SelectValue placeholder={t('timezonePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map(tz => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  {t('timezoneDescription')}
                </p>
              </div>
            </div>
          </ProfileSection>

          {hasPassword && (
            <ProfileSection
              title={t('passwordTitle')}
              description={t('passwordDescription')}
              icon={<KeyRound className="h-5 w-5" aria-hidden />}
              actions={
                !showPasswordForm && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordForm(true)}
                    className="w-full sm:w-auto"
                  >
                    {t('changePassword')}
                  </Button>
                )
              }
            >
              {showPasswordForm ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      disabled={passwordLoading}
                      autoComplete="current-password"
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
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
                    <Button
                      type="button"
                      disabled={passwordLoading || !currentPassword || !newPassword}
                      onClick={handlePasswordChange}
                      className="w-full sm:w-auto"
                    >
                      {passwordLoading ? t('saving') : t('save')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setCurrentPassword('');
                        setNewPassword('');
                      }}
                      className="w-full sm:w-auto"
                    >
                      {t('cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('passwordIdleDescription')}</p>
              )}
            </ProfileSection>
          )}

          <ProfileSection
            title={t('googleAccount')}
            description={t('googleAccountDescription')}
            icon={<Mail className="h-5 w-5" aria-hidden />}
            actions={
              isGoogleLinked ? (
                <Button
                  variant="outline"
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
                  {t('linkGoogle')}
                </Button>
              )
            }
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium">
                  {isGoogleLinked ? t('googleLinkedStatus') : t('googleNotLinkedStatus')}
                </div>
                {isGoogleLinked && googleLinkedAt && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {t('linkedToGoogle', { date: formatGoogleLinkedDate(googleLinkedAt) })}
                  </div>
                )}
              </div>
              <Badge variant={isGoogleLinked ? 'secondary' : 'outline'} className="w-fit">
                {isGoogleLinked ? t('connectedStatus') : t('notConnectedStatus')}
              </Badge>
            </div>
          </ProfileSection>

          <ProfileSection
            title={getProfileText('passkeysTitle')}
            description={getProfileText('passkeysDescription')}
            icon={<Fingerprint className="h-5 w-5" aria-hidden />}
            actions={
              <>
                {passkeys.length > 0 && (
                  <Button
                    variant="outline"
                    type="button"
                    size="sm"
                    onClick={() => setShowDeletePasskeysConfirm(true)}
                    disabled={passkeyLoading}
                    className="w-full sm:w-auto"
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
                  className="w-full sm:w-auto"
                >
                  {getProfileText('createPasskey')}
                </Button>
              </>
            }
          >
            {passkeys.length > 0 ? (
              <div className="grid gap-3">
                {passkeys.map(passkey => (
                  <div
                    key={passkey.credentialID}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-medium">{getPasskeyLabel(passkey)}</div>
                      <div className="truncate font-mono text-xs text-muted-foreground">
                        {passkey.credentialID.slice(0, 16)}...
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      type="button"
                      size="sm"
                      onClick={() => setPendingDeleteId(passkey.credentialID)}
                      disabled={passkeyLoading}
                      className="w-full shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                    >
                      {getProfileText('passkeyDeleteOne')}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                {t('passkeysEmpty')}
              </div>
            )}
          </ProfileSection>

          <ProfileSection
            title={t('deleteAccountTitle')}
            description={t('deleteAccountDescription')}
            icon={<Trash2 className="h-5 w-5" aria-hidden />}
            variant="danger"
          >
            <Button
              variant="destructive"
              type="button"
              onClick={() => setShowDeleteAccountConfirm(true)}
              disabled={deleteAccountLoading}
              className="w-full sm:w-auto"
            >
              {t('deleteAccountButton')}
            </Button>
          </ProfileSection>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold leading-6">{t('accountSummaryTitle')}</h2>
                <p className="text-sm leading-5 text-muted-foreground">
                  {t('accountSummaryDescription')}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <StatusItem label={t('emailLabel')} value={user.email || userEmail} />
              <StatusItem
                label={t('googleAccount')}
                value={isGoogleLinked ? t('connectedStatus') : t('notConnectedStatus')}
              />
              <StatusItem label={getProfileText('passkeysTitle')} value={passkeys.length} />
              {role === 'ADMIN' && (
                <StatusItem
                  label={t('roleLabel')}
                  value={<Badge variant="secondary">ADMIN</Badge>}
                />
              )}
            </div>
          </section>

          {lastLoginAt && (
            <section className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Clock className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold leading-6">{t('lastLoginTitle')}</h2>
                  <p className="text-sm leading-5 text-muted-foreground">
                    {t('lastLoginDescription')}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <StatusItem label={t('lastLoginDate')} value={formatLastLogin(lastLoginAt)} />
                {lastLoginIp && (
                  <StatusItem
                    label="IP"
                    value={<span className="font-mono text-xs">{lastLoginIp}</span>}
                  />
                )}
              </div>
            </section>
          )}
        </aside>
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
