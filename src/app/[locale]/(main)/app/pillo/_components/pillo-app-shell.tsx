'use client';

import { CalendarClock, Home, Pill, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePilloTabs } from '../_hooks/use-pillo-tabs';
import type {
  PilloAppearanceSettingsView,
  PilloIntakeView,
  PilloMedicationView,
  PilloScheduleRuleView,
  PilloSettingsView,
  PilloTab
} from './types';

import { TodayView } from './today-view';
import { MedicationsView } from './medications-view';
import { ScheduleView } from './schedule-view';
import { SettingsView } from './pillo-settings-view';

interface PilloAppShellProps {
  appearanceSettings: PilloAppearanceSettingsView;
  intakes: PilloIntakeView[];
  medications: PilloMedicationView[];
  scheduleRules: PilloScheduleRuleView[];
  settings: PilloSettingsView;
}

const tabs: Array<{ icon: typeof Home; id: PilloTab; labelKey: string }> = [
  { id: 'home', labelKey: 'tabs.home', icon: Home },
  { id: 'medications', labelKey: 'tabs.medications', icon: Pill },
  { id: 'schedule', labelKey: 'tabs.schedule', icon: CalendarClock },
  { id: 'settings', labelKey: 'tabs.settings', icon: Settings }
];

/**
 * Главный клиентский shell Pillo с нижней навигацией.
 * @param props - данные Pillo, подготовленные на сервере.
 * @returns Мобильный интерфейс мини-приложения.
 */
export const PilloAppShell = ({
  appearanceSettings,
  intakes,
  medications,
  scheduleRules,
  settings
}: PilloAppShellProps) => {
  const t = useTranslations('Pillo');
  const { activeTab, setActiveTab } = usePilloTabs('home');
  const todayPendingCount = intakes.filter(item => item.status === 'PENDING').length;

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)),transparent_34%),hsl(var(--background))] pb-24">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-4 pt-3">
        <header className="sticky top-0 z-20 -mx-4 border-b border-white/40 bg-background/80 px-4 py-3 backdrop-blur-2xl dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t('eyebrow')}
              </p>
              <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
            </div>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {t('pendingCount', { count: todayPendingCount })}
            </Badge>
          </div>
        </header>

        <main className="flex-1 py-4">
          {activeTab === 'home' && <TodayView intakes={intakes} />}
          {activeTab === 'medications' && <MedicationsView medications={medications} />}
          {activeTab === 'schedule' && (
            <ScheduleView medications={medications} scheduleRules={scheduleRules} />
          )}
          {activeTab === 'settings' && (
            <SettingsView settings={settings} appearanceSettings={appearanceSettings} />
          )}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/50 bg-background/85 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur-2xl dark:border-white/10">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.75rem] bg-muted/70 p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.35rem] text-[11px] font-medium text-muted-foreground transition',
                activeTab === tab.id && 'bg-background text-foreground shadow-sm'
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span>{t(tab.labelKey)}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
