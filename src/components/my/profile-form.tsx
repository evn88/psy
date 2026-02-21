'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useSession, signIn } from 'next-auth/react';
import { startRegistration } from '@simplewebauthn/browser';
import { useTranslations } from 'next-intl';

interface ProfileFormProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
  hasPasskeys: boolean;
  isGoogleLinked: boolean;
}

/**
 * Форма профиля пользователя.
 * Позволяет обновить имя, управлять passkeys.
 * Используется как в личном кабинете (/my/profile), так и в админке (/admin/profile).
 */
export const ProfileForm = ({
  user,
  hasPasskeys: initialHasPasskeys,
  isGoogleLinked: initialIsGoogleLinked
}: ProfileFormProps) => {
  const t = useTranslations('Profile');
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(user.name ?? '');
  const [loading, setLoading] = useState(false);
  const [hasPasskeys, setHasPasskeys] = useState(initialHasPasskeys);
  const [isGoogleLinked, setIsGoogleLinked] = useState(initialIsGoogleLinked);

  const [alertInfo, setAlertInfo] = useState<{ open: boolean; title: string; description: string }>(
    {
      open: false,
      title: '',
      description: ''
    }
  );

  /**
   * Отображает информационное диалоговое окно.
   * @param title - заголовок диалога
   * @param description - описание
   */
  const showAlert = (title: string, description: string) => {
    setAlertInfo({ open: true, title, description });
  };

  /**
   * Отправляет запрос на обновление имени пользователя.
   * @param e - событие формы
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        body: JSON.stringify({ name }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        throw new Error(t('updateFailed'));
      }

      await update({ name });
      router.refresh();
    } catch (error) {
      console.error(error);
      showAlert(t('errorTitle'), t('updateFailed'));
      setLoading(false);
    }
  };

  /**
   * Запускает процесс создания нового passkey через WebAuthn.
   */
  const handleCreatePasskey = async () => {
    try {
      const resp = await fetch('/api/profile/passkeys/register/options');
      const options = await resp.json();

      if (options.error) {
        throw new Error(options.error);
      }

      const attResp = await startRegistration(options);

      const verifyResp = await fetch('/api/profile/passkeys/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp)
      });

      const verificationResult = await verifyResp.json();

      if (verificationResult.verified) {
        setHasPasskeys(true);
        showAlert(t('successTitle'), t('passkeySuccess'));
      } else {
        throw new Error(verificationResult.error || t('passkeyVerifyFailed'));
      }
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error && error.name === 'NotAllowedError') {
        return;
      }
      const message = error instanceof Error ? error.message : t('passkeyCreateFailed');
      showAlert(t('errorTitle'), `${t('passkeyCreateFailed')}: ${message}`);
    }
  };

  /**
   * Удаляет все passkeys пользователя.
   */
  const handleClearPasskeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile/passkeys', {
        method: 'DELETE'
      });
      if (res.ok) {
        setHasPasskeys(false);
        showAlert(t('successTitle'), t('clearSuccess'));
      } else {
        showAlert(t('errorTitle'), t('clearFailed'));
      }
    } catch {
      showAlert(t('errorTitle'), t('clearError'));
    } finally {
      setLoading(false);
    }
  };
  /**
   * Запускает процесс привязки Google аккаунта.
   */
  const handleLinkGoogle = async () => {
    setLoading(true);
    await signIn('google', { callbackUrl: window.location.href });
  };

  /**
   * Отвязывает Google аккаунт.
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

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="name">{t('nameLabel')}</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>{t('emailLabel')}</Label>
          <Input defaultValue={user.email ?? ''} disabled className="bg-muted" />
        </div>

        <div className="grid gap-2 pt-4 border-t border-border">
          <Label>{t('securityLabel')}</Label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-border p-4 bg-card">
            <div className="space-y-0.5">
              <div className="font-medium">{t('passkeysTitle')}</div>
              <div className="text-sm text-muted-foreground">{t('passkeysDescription')}</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    type="button"
                    disabled={loading || !hasPasskeys}
                    className="w-full sm:w-auto"
                  >
                    {t('clearPasskeys')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('clearPasskeysConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('clearPasskeysConfirmDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearPasskeys}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('deletePasskeys')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="outline"
                type="button"
                onClick={handleCreatePasskey}
                disabled={loading || hasPasskeys}
                className="w-full sm:w-auto"
              >
                {t('createPasskey')}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-2 pt-4 border-t border-border">
          <Label>{t('googleAccount')}</Label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-border p-4 bg-card">
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
        </div>
      </form>

      <AlertDialog
        open={alertInfo.open}
        onOpenChange={open => setAlertInfo(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertInfo.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertInfo.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertInfo(prev => ({ ...prev, open: false }))}>
              {t('ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
