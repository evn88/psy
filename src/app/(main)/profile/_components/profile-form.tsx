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

interface ProfileFormProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
  hasPasskeys: boolean;
}

export function ProfileForm({ user, hasPasskeys: initialHasPasskeys }: ProfileFormProps) {
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

  const showAlert = (title: string, description: string) => {
    setAlertInfo({ open: true, title, description });
  };

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
        throw new Error('Failed to update profile');
      }

      // Update session
      await update({ name });

      router.refresh();
    } catch (error) {
      console.error(error);
      showAlert('Error', 'Failed to update profile');
      setLoading(false);
    }
  };

  const handleCreatePasskey = async () => {
    try {
      // 1. Получаем опции с сервера
      const resp = await fetch('/api/profile/passkeys/register/options');
      const options = await resp.json();

      if (options.error) {
        throw new Error(options.error);
      }

      // 2. Открываем системный диалог для создания ключа
      const attResp = await startRegistration(options);

      // 3. Отправляем ответ обратно на сервер для проверки и сохранения
      const verifyResp = await fetch('/api/profile/passkeys/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp)
      });

      const verificationResult = await verifyResp.json();

      if (verificationResult.verified) {
        setHasPasskeys(true);
        showAlert('Success', 'Passkey created successfully!');
      } else {
        throw new Error(verificationResult.error || 'Failed to verify passkey');
      }
    } catch (error: any) {
      console.error(error);
      if (error.name === 'NotAllowedError') {
        // пользователь отменил
        return;
      }
      showAlert('Error', `Failed to create passkey: ${error.message}`);
    }
  };

  const handleClearPasskeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile/passkeys', {
        method: 'DELETE'
      });
      if (res.ok) {
        setHasPasskeys(false);
        showAlert('Success', 'All passkeys cleared! You can now create a new one.');
      } else {
        showAlert('Error', 'Failed to clear passkeys');
      }
    } catch (error) {
      console.error(error);
      showAlert('Error', 'Error clearing passkeys');
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
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Email</Label>
          <Input defaultValue={user.email ?? ''} disabled className="bg-muted" />
        </div>

        <div className="grid gap-2 pt-4 border-t border-border">
          <Label>Security</Label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-border p-4 bg-card">
            <div className="space-y-0.5">
              <div className="font-medium">Passkeys</div>
              <div className="text-sm text-muted-foreground">
                Secure your account with a passkey.
              </div>
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
                    Clear Passkeys
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all your saved
                      passkeys. You won&apos;t be able to log in with them anymore.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearPasskeys}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Passkeys
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
                Create Passkey
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
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
