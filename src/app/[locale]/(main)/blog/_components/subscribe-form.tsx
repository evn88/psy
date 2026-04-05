'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/blog/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.status === 409) {
        toast.info('Этот email уже подписан');
        setDone(true);
        return;
      }
      if (!res.ok) throw new Error();
      setDone(true);
      toast.success('Вы подписались на новые статьи!');
    } catch {
      toast.error('Не удалось подписаться. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <p className="text-sm text-muted-foreground">
        Вы подписаны — будете получать уведомления о новых статьях.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap sm:flex-nowrap">
      <Input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Ваш email"
        required
        className="focus-visible:ring-ring"
      />
      <Button type="submit" disabled={loading} className="whitespace-nowrap">
        {loading ? 'Подписываю...' : 'Подписаться'}
      </Button>
    </form>
  );
}
