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
import { useSession } from 'next-auth/react';
import { startRegistration } from '@simplewebauthn/browser';
import { useTranslations } from 'next-intl';

interface ProfileFormProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
  hasPasskeys: boolean;
}

/**
 * Форма профиля пользователя.
 * Позволяет обновить имя, управлять passkeys.
 * Использует next-intl для интернационализации.
 */
export const ProfileForm = ({ user, hasPasskeys: initialHasPasskeys }: ProfileFormProps) => {
  const t = useTranslations('Profile');
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(user.name ?? '');
  const [loading, setLoading] = useState(false);
  const [hasPasskeys, setHasPasskeys] = useState(initialHasPasskeys);

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

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
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
