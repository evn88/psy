'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/alert-dialog';
import { useTranslations } from 'next-intl';

interface ProfileFormProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
  hasPasskeys: boolean;
  isGoogleLinked: boolean;
  googleLinkedAt?: Date | null;
}

/**
 * Форма управления профилем пользователя.
 * Позволяет обновлять имя, управлять passkeys и привязкой Google.
 */
export const ProfileForm = ({
  user,
  hasPasskeys: initialHasPasskeys,
  isGoogleLinked: initialIsGoogleLinked,
  googleLinkedAt
}: ProfileFormProps) => {
  const t = useTranslations('Profile');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user.name || '');
  const [isGoogleLinked, setIsGoogleLinked] = useState(initialIsGoogleLinked);
  const [showAlertOpen, setShowAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '' });

  /**
   * Показывает диалоговое окно с сообщением.
   */
  const showAlert = (title: string, message: string) => {
    setAlertConfig({ title, message });
    setShowAlertOpen(true);
  };

  /**
   * Обрабатывает сохранение имени пользователя.
   */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        body: JSON.stringify({ name }),
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
   * Инициирует привязку Google аккаунта.
   */
  const handleLinkGoogle = async () => {
    setLoading(true);
    // При входе через провайдера NextAuth автоматически привяжет аккаунт к текущему пользователю
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

        <Button type="submit" disabled={loading || name === user.name}>
          {loading ? t('saving') : t('save')}
        </Button>

        <div className="pt-4 border-t border-border">
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
          {isGoogleLinked && (
            <div className="text-sm text-muted-foreground mt-2">
              <span className="font-medium text-foreground">{t('linkedAccount')} </span>
              {t('linkedAccountInfo', {
                name: user.name || 'N/A',
                email: user.email || 'N/A',
                date: googleLinkedAt ? new Date(googleLinkedAt).toLocaleDateString('ru-RU') : 'N/A'
              })}
            </div>
          )}
        </div>
      </form>

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
    </>
  );
};
