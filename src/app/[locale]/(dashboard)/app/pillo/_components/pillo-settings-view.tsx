import {
  Globe,
  Mail,
  MessageSquare,
  PackagePlus,
  Palette,
  ShieldCheck,
  ShoppingBasket
} from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SettingsForm } from '@/components/settings-form';
import { Button } from '@/components/ui/button';
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
import { PilloPendingIndicator } from './pillo-pending-indicator';
import { PilloSwitchControl } from './pillo-switch-control';
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
    color: 'bg-indigo-500'
  },
  {
    name: 'lowStockPushEnabled',
    labelKey: 'settings.lowStockPush',
    icon: PackagePlus,
    color: 'bg-amber-500'
  }
] as const;

type AppearanceFormState = {
  isDirty: boolean;
  isPending: boolean;
  submit: () => Promise<void>;
};

/**
 * Рисует настройки Pillo и общие настройки темы/языка.
 * Реализовано в премиальном стиле iOS 26 с эффектами матового стекла и сгруппированными списками.
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
  const [appearanceFormState, setAppearanceFormState] = useState<AppearanceFormState | null>(null);
  const {
    form,
    isPending,
    isDirty,
    onLowStockWarningDaysBlur,
    onLowStockWarningDaysChange,
    onSubmit,
    onToggle,
    values
  } = usePilloSettingsForm(settings);

  const isAppearanceDirty = appearanceFormState?.isDirty ?? false;
  const isAppearancePending = appearanceFormState?.isPending ?? false;
  const hasUnsavedChanges = isDirty || isAppearanceDirty;
  const isSaving = isPending || isAppearancePending;

  const handleSaveAll = async () => {
    if (isSaving || !hasUnsavedChanges) {
      return;
    }

    if (isDirty) {
      await onSubmit({ refresh: !isAppearanceDirty });
    }

    if (isAppearanceDirty) {
      await appearanceFormState?.submit();
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 pb-12 duration-700">
      {/* Секция Уведомлений */}
      <section className="space-y-3">
        <div className="px-5">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50">
            {t('settings.notifications')}
          </h2>
        </div>
        <Card className="overflow-hidden rounded-[2rem] border-white/40 bg-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-2xl transition-all hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-black/40">
          <CardContent className="divide-y divide-black/[0.04] p-0 dark:divide-white/[0.04]">
            {NOTIFICATIONS.map(({ name, labelKey, icon: Icon, color }, index) => (
              <div
                key={name}
                className={cn(
                  'group flex items-center justify-between gap-4 px-5 py-4 transition-all active:bg-black/[0.03] dark:active:bg-white/[0.03]'
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-[0.75rem] text-white shadow-sm ring-4 ring-white/10 transition-transform group-hover:scale-105 dark:ring-white/5',
                      color
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <Label className="text-[16px] font-semibold tracking-tight text-foreground/90">
                    {t(labelKey)}
                  </Label>
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
      <section className="space-y-3">
        <div className="px-5">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50">
            {t('settings.stock')}
          </h2>
        </div>
        <Card className="rounded-[2rem] border-white/40 bg-white/40 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/40">
          <Form {...form}>
            <FormField
              control={form.control}
              name="lowStockWarningDays"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.75rem] bg-amber-500 text-white shadow-sm ring-4 ring-white/10 dark:ring-white/5">
                      <ShoppingBasket className="h-4.5 w-4.5" />
                    </div>
                    <FormLabel className="text-[16px] font-semibold tracking-tight text-foreground/90">
                      {t('settings.lowStockWarningDays')}
                    </FormLabel>
                  </div>
                  <FormDescription className="px-1 text-[13px] leading-relaxed text-muted-foreground/60">
                    {t('settings.lowStockWarningDaysDescription')}
                  </FormDescription>
                  <FormControl>
                    <div className="relative">
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
                        className="h-12 w-full rounded-2xl border-none bg-black/[0.03] px-4 text-lg font-medium ring-1 ring-black/[0.05] transition-all focus:bg-white/80 focus:ring-primary/40 dark:bg-white/[0.03] dark:ring-white/[0.05] dark:focus:bg-black/60"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-widest text-muted-foreground/40">
                        {t('settings.days')}
                      </div>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </Form>
        </Card>
      </section>

      {/* Секция Внешнего вида */}
      <section className="space-y-3">
        <div className="px-5">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50">
            {t('settings.appearance')}
          </h2>
        </div>
        <Card className="rounded-[2rem] border-white/40 bg-white/40 p-1 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/40">
          <SettingsForm
            hideSubmitButton
            initialSettings={appearanceSettings}
            onStateChange={setAppearanceFormState}
            variant="ghost"
          />
        </Card>
      </section>

      {/* Секция О приложении */}
      <section className="space-y-3">
        <div className="px-5">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50">
            {t('settings.about')}
          </h2>
        </div>
        <Card className="rounded-[2rem] border-white/40 bg-white/40 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/40">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary/10 text-primary shadow-inner">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[15px] font-bold tracking-tight">Pillo Pro</p>
              <p className="text-[13px] font-medium text-muted-foreground/60 leading-tight">
                {t('settings.secureDescription')}
              </p>
              <p className="text-[11px] font-semibold text-primary/60 pt-0.5 tracking-wider uppercase">
                v2.1.0-alpha
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Кнопка сохранения - фиксированная над нижней навигацией */}
      {(hasUnsavedChanges || isSaving) && (
        <div className="fixed bottom-[5.75rem] left-0 right-0 z-50 px-6 animate-in fade-in slide-in-from-bottom-8 duration-500 pointer-events-none">
          <div className="mx-auto max-w-md pointer-events-auto">
            <Button
              type="button"
              className={cn(
                'group relative h-14 w-full rounded-[1.5rem] bg-primary text-lg font-bold shadow-[0_10px_30px_rgba(var(--primary-rgb),0.4)] transition-all active:scale-[0.98] opacity-100'
              )}
              disabled={isSaving}
              onClick={() => {
                void handleSaveAll();
              }}
            >
              {isSaving ? (
                <PilloPendingIndicator label={t('common.saving')} />
              ) : (
                <span className="flex items-center justify-center">{t('common.save')}</span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
