'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from 'next-auth/react';
import { startRegistration } from '@simplewebauthn/browser';

interface ProfileFormProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(user.name ?? '');
  const [loading, setLoading] = useState(false);

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
      alert('Failed to update profile');
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
        alert('Passkey created successfully!');
      } else {
        throw new Error(verificationResult.error || 'Failed to verify passkey');
      }
    } catch (error: any) {
      console.error(error);
      if (error.name === 'NotAllowedError') {
        // пользователь отменил
        return;
      }
      alert(`Failed to create passkey: ${error.message}`);
    }
  };

  const handleClearPasskeys = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all saved passkeys? You won't be able to log in with them anymore."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/profile/passkeys', {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('All passkeys cleared! You can now create a new one.');
      } else {
        alert('Failed to clear passkeys');
      }
    } catch (error) {
      console.error(error);
      alert('Error clearing passkeys');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <div className="flex gap-2">
          <Input id="name" value={name} onChange={e => setName(e.target.value)} />
          <Button type="submit" disabled={loading}>
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
        <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-card">
          <div className="space-y-0.5">
            <div className="font-medium">Passkeys</div>
            <div className="text-sm text-muted-foreground">Secure your account with a passkey.</div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              type="button"
              onClick={handleClearPasskeys}
              disabled={loading}
            >
              Clear Passkeys
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={handleCreatePasskey}
              disabled={loading}
            >
              Create Passkey
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
