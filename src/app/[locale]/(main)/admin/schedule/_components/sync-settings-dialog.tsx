'use client';

import { useState } from 'react';
import { Info, Settings } from 'lucide-react';
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
  initialWorkStart?: number;
  initialWorkEnd?: number;
}

export function SyncSettingsDialog({
  initialUrl,
  initialEnabled,
  initialWorkStart = 9,
  initialWorkEnd = 20
}: SyncSettingsDialogProps) {
  const t = useTranslations('Schedule');
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(initialUrl || '');
  const [enabled, setEnabled] = useState(initialEnabled || false);
  const [workStart, setWorkStart] = useState(initialWorkStart.toString());
  const [workEnd, setWorkEnd] = useState(initialWorkEnd.toString());
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleCalendarSyncUrl: url || null,
          googleCalendarSyncEnabled: enabled,
          workHourStart: parseInt(workStart) || 0,
          workHourEnd: parseInt(workEnd) || 24
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
          <DialogTitle>{t('settingsTitle')}</DialogTitle>
          <DialogDescription>{t('settingsDescription')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-4 bg-muted/20 p-4 rounded-lg border">
            <h4 className="font-semibold text-sm">{t('workHours')}</h4>
            <div className="flex items-center gap-4">
              <div className="grid gap-2 flex-1">
                <Label htmlFor="workStart">{t('startHour')}</Label>
                <Input
                  id="workStart"
                  type="number"
                  min="0"
                  max="23"
                  value={workStart}
                  onChange={e => setWorkStart(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2 flex-1">
                <Label htmlFor="workEnd">{t('endHour')}</Label>
                <Input
                  id="workEnd"
                  type="number"
                  min="1"
                  max="24"
                  value={workEnd}
                  onChange={e => setWorkEnd(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border">
            <Checkbox
              id="enabled"
              checked={enabled}
              onCheckedChange={checked => setEnabled(checked as boolean)}
            />
            <Label htmlFor="enabled" className="text-base font-medium cursor-pointer">
              {t('enableGoogleCalendar')}
            </Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="url">{t('webhookUrl')}</Label>
            <Input
              id="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              disabled={loading || !enabled}
            />
          </div>

          <details className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900 group">
            <summary className="flex items-center text-sm font-semibold text-blue-800 dark:text-blue-300 cursor-pointer select-none">
              <Info className="w-4 h-4 mr-2" />
              {t('howToGetLink')}
              <span className="ml-auto opacity-70 text-xs transition-transform group-open:rotate-180">
                ▼
              </span>
            </summary>
            <ol className="list-decimal list-inside text-xs space-y-2 text-blue-900/80 dark:text-blue-200/80 mt-3 pt-3 border-t border-blue-100/50">
              <li>{t('googleStep1')}</li>
              <li>{t('googleStep2')}</li>
              <li>{t('googleStep3')}</li>
              <li>{t('googleStep4')}</li>
              <li>{t('googleStep5')}</li>
            </ol>
          </details>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
