import { Mail, MessageSquare, PackagePlus, ShieldCheck, ShoppingBasket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SettingsForm } from '@/components/SettingsForm';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { usePilloSettingsForm } from '../_hooks/use-pillo-settings-form';
import { PilloSwitchControl } from './PilloSwitchControl';
import type { PilloAppearanceSettingsView, PilloSettingsView } from './types';

const NOTIFICATIONS = [
  {
    name: 'emailRemindersEnabled',
    labelKey: 'settings.emailReminders',
    icon: Mail,
    color: 'bg-blue-500'
  },
  {
    name: 'pushRemindersEnabled',
    labelKey: 'settings.pushReminders',
    icon: MessageSquare,
    color: 'bg-emerald-500'
  },
  {
    name: 'lowStockEmailEnabled',
    labelKey: 'settings.lowStockEmail',
    icon: Mail,
    color: 'bg-blue-500'
  },
  {
    name: 'lowStockPushEnabled',
    labelKey: 'settings.lowStockPush',
    icon: PackagePlus,
    color: 'bg-amber-500'
  }
] as const;

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
  const {
    form,
    isPending,
    onLowStockWarningDaysBlur,
    onLowStockWarningDaysChange,
    onToggle,
    values
  } = usePilloSettingsForm(settings);

  return (
    <div className="space-y-6 pb-8">
      {/* Секция Уведомлений */}
      <section className="space-y-2.5">
        <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {t('settings.notifications')}
        </h2>
        <Card className="overflow-hidden rounded-[1.75rem] border-white/40 bg-white/60 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/20">
          <CardContent className="divide-y divide-black/[0.03] p-0 dark:divide-white/[0.03]">
            {NOTIFICATIONS.map(({ name, labelKey, icon: Icon, color }, index) => (
              <div
                key={name}
                className={cn(
                  'flex items-center justify-between gap-4 px-4 py-3.5 transition-colors active:bg-black/[0.02] dark:active:bg-white/[0.02]',
                  index === 0 && 'pt-4',
                  index === NOTIFICATIONS.length - 1 && 'pb-4'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm',
                      color
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <Label className="text-[15px] font-medium tracking-tight">{t(labelKey)}</Label>
                </div>
                <PilloSwitchControl
                  checked={Boolean(values[name as keyof PilloSettingsView])}
                  disabled={isPending}
                  onCheckedChange={checked => onToggle(name, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Секция Запасов */}
      <section className="space-y-2.5">
        <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {t('settings.stock')}
        </h2>
        <Card className="rounded-[1.75rem] border-white/40 bg-white/60 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/20">
          <Form {...form}>
            <FormField
              control={form.control}
              name="lowStockWarningDays"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                      <ShoppingBasket className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <FormLabel className="text-[15px] font-medium tracking-tight">
                        {t('settings.lowStockWarningDays')}
                      </FormLabel>
                      <FormDescription className="text-xs leading-relaxed text-muted-foreground/70">
                        {t('settings.lowStockWarningDaysDescription')}
                      </FormDescription>
                      <FormControl>
                        <Input
                          {...field}
                          value={Number(values.lowStockWarningDays)}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          disabled={isPending}
                          onBlur={() => {
                            field.onBlur();
                            onLowStockWarningDaysBlur();
                          }}
                          onChange={event => onLowStockWarningDaysChange(event.target.value)}
                          onKeyDown={event => {
                            if (['-', '.', ',', 'e', 'E', '+'].includes(event.key)) {
                              event.preventDefault();
                            }
                          }}
                          className="h-11 rounded-2xl bg-white/70 text-base dark:bg-white/5"
                        />
                      </FormControl>
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </Form>
        </Card>
      </section>

      {/* Секция Внешнего вида */}
      <section className="space-y-2.5">
        <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {t('settings.appearance')}
        </h2>
        <Card className="rounded-[1.75rem] border-white/40 bg-white/60 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/20">
          <SettingsForm initialSettings={appearanceSettings} variant="ghost" />
        </Card>
      </section>

      {/* Секция О приложении */}
      <section className="space-y-2.5">
        <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {t('settings.about')}
        </h2>
        <Card className="rounded-[1.75rem] border-white/40 bg-white/60 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/20">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">Pillo v2.0</p>
              <p className="text-xs text-muted-foreground/70">{t('settings.secureDescription')}</p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};
