'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslations } from 'next-intl';

export interface SyncSettingsDialogProps {
  initialUrl?: string | null;
  initialEnabled?: boolean;
}

export function SyncSettingsDialog({ initialUrl, initialEnabled }: SyncSettingsDialogProps) {
  const t = useTranslations('Schedule');
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(initialUrl || '');
  const [enabled, setEnabled] = useState(initialEnabled || false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleCalendarSyncUrl: url || null,
          googleCalendarSyncEnabled: enabled
        })
      });
      if (res.ok) {
        setOpen(false);
      } else {
        console.error('Failed to update sync settings');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Google Calendar Sync Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Синхронизация Google Calendar</DialogTitle>
          <DialogDescription>
            Настройте подключение Google Calendar для дублирования ваших записей.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enabled"
              checked={enabled}
              onCheckedChange={checked => setEnabled(checked as boolean)}
            />
            <Label htmlFor="enabled">Включить автоматическую синхронизацию</Label>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">Google Calendar OAuth / Webhook URL (опционально)</Label>
            <Input
              id="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              disabled={loading || !enabled}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
