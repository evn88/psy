import { useMemo } from 'react';
import { Bell, Languages, Moon, PackagePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SettingsForm } from '@/app/[locale]/(main)/admin/settings/_components/settings-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { usePilloSettingsForm } from '../_hooks/use-pillo-settings-form';
import type { PilloAppearanceSettingsView, PilloSettingsView } from './types';

/**
 * Рисует настройки Pillo и общие настройки темы/языка.
 * @param props - настройки уведомлений и внешнего вида.
 * @returns Экран настроек.
 */
export const SettingsView = ({
  appearanceSettings,
  settings
}: {
  appearanceSettings: PilloAppearanceSettingsView;
  settings: PilloSettingsView;
}) => {
  const t = useTranslations('Pillo');
  const { isPending, onToggle, values } = usePilloSettingsForm(settings);

  const rows = useMemo(
    () =>
      [
        ['emailRemindersEnabled', 'settings.emailReminders', Bell],
        ['pushRemindersEnabled', 'settings.pushReminders', Bell],
        ['lowStockEmailEnabled', 'settings.lowStockEmail', PackagePlus],
        ['lowStockPushEnabled', 'settings.lowStockPush', PackagePlus]
      ] as const,
    []
  );

  return (
    <div className="space-y-4">
      <Card className="rounded-[1.5rem] border-white/60 bg-card/90 shadow-sm dark:border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('settings.notifications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map(([name, labelKey, Icon]) => (
            <div key={name} className="flex items-center justify-between gap-4">
              <Label className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4" />
                {t(labelKey)}
              </Label>
              <Switch
                checked={Boolean(values[name])}
                disabled={isPending}
                onCheckedChange={checked => onToggle(name, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[1.5rem] border-white/60 bg-card/90 shadow-sm dark:border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t('settings.appearance')}
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            {t('settings.appearanceDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm initialSettings={appearanceSettings} />
        </CardContent>
      </Card>
    </div>
  );
};
