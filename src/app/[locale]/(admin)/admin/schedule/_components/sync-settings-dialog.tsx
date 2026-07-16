'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, CalendarSync, Settings } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { useRouter } from '@/i18n/navigation';

export interface SyncSettingsDialogProps {
  initialConnected?: boolean;
  calendarName?: string | null;
  googleStatus?: string;
  initialWorkStart?: number;
  initialWorkEnd?: number;
}

export const SyncSettingsDialog = ({
  initialConnected = false,
  calendarName,
  googleStatus,
  initialWorkStart = 9,
  initialWorkEnd = 20
}: SyncSettingsDialogProps) => {
  const t = useTranslations('Schedule');
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(initialConnected);
  const [workStart, setWorkStart] = useState(initialWorkStart.toString());
  const [workEnd, setWorkEnd] = useState(initialWorkEnd.toString());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!googleStatus) {
      return;
    }

    if (googleStatus === 'connected') {
      toast.success(t('googleConnectedSuccess'));
    } else if (googleStatus === 'connected-with-errors') {
      toast.warning(t('googleConnectedWithErrors'));
    } else if (googleStatus === 'configuration-error') {
      toast.error(t('googleConfigurationError'));
    } else {
      toast.error(t('googleConnectionError'));
    }
  }, [googleStatus, t]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workHourStart: Number(workStart),
          workHourEnd: Number(workEnd)
        })
      });

      if (!response.ok) {
        const result = (await response.json()) as { message?: string };
        throw new Error(result.message || t('settingsSaveError'));
      }

      toast.success(t('settingsSaved'));
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settingsSaveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/google-calendar/disconnect', { method: 'POST' });
      if (!response.ok) {
        throw new Error(t('googleDisconnectError'));
      }
      setConnected(false);
      toast.success(t('googleDisconnected'));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('googleDisconnectError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/google-calendar/sync', { method: 'POST' });
      const result = (await response.json()) as {
        synced?: number;
        failed?: number;
        message?: string;
      };
      if (!response.ok || (result.failed ?? 0) > 0) {
        throw new Error(result.message || t('googleSyncError'));
      }
      toast.success(t('googleSyncSuccess', { count: result.synced ?? 0 }));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('googleSyncError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t('settingsTitle')}>
          <Settings data-icon="inline-start" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('settingsTitle')}</DialogTitle>
          <DialogDescription>{t('settingsDescription')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          <section className="flex flex-col gap-3" aria-labelledby="work-hours-title">
            <h3 id="work-hours-title" className="text-sm font-semibold">
              {t('workHours')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="workStart">{t('startHour')}</Label>
                <Input
                  id="workStart"
                  type="number"
                  min="0"
                  max="23"
                  value={workStart}
                  onChange={event => setWorkStart(event.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="workEnd">{t('endHour')}</Label>
                <Input
                  id="workEnd"
                  type="number"
                  min="1"
                  max="24"
                  value={workEnd}
                  onChange={event => setWorkEnd(event.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="google-calendar-title">
            <h3 id="google-calendar-title" className="text-sm font-semibold">
              Google Calendar
            </h3>
            {connected ? (
              <Alert>
                <CalendarCheck />
                <AlertTitle>{t('googleConnected')}</AlertTitle>
                <AlertDescription>
                  {calendarName
                    ? t('googleConnectedCalendar', { calendar: calendarName })
                    : t('googleConnectedDescription')}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CalendarSync />
                <AlertTitle>{t('googleNotConnected')}</AlertTitle>
                <AlertDescription>{t('googleOutboundDescription')}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              {connected ? (
                <>
                  <Button type="button" variant="outline" onClick={handleSync} disabled={loading}>
                    <CalendarSync data-icon="inline-start" />
                    {t('syncNow')}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={loading}
                  >
                    {t('disconnectGoogle')}
                  </Button>
                </>
              ) : (
                <Button asChild>
                  <a href={`/api/google-calendar/connect?locale=${encodeURIComponent(locale)}`}>
                    {t('connectGoogle')}
                  </a>
                </Button>
              )}
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? t('saving') : t('saveWorkHours')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
