'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface BlogNotificationsToggleProps {
  initialValue: boolean;
}

export function BlogNotificationsToggle({ initialValue }: BlogNotificationsToggleProps) {
  const [enabled, setEnabled] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const handleChange = async (value: boolean) => {
    setEnabled(value);
    setLoading(true);
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogNotifications: value })
      });
      if (!res.ok) throw new Error();
      toast.success(value ? 'Уведомления включены' : 'Уведомления отключены');
    } catch {
      setEnabled(!value);
      toast.error('Не удалось сохранить настройку');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Switch
        id="blog-notifications"
        checked={enabled}
        onCheckedChange={handleChange}
        disabled={loading}
      />
      <Label htmlFor="blog-notifications" className="cursor-pointer">
        Получать уведомления о новых статьях в блоге
      </Label>
    </div>
  );
}
