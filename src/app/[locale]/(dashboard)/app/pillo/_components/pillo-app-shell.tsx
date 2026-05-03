'use client';

import { CalendarClock, Home, LayoutGrid, Pill, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePilloTabs } from '../_hooks/use-pillo-tabs';
import type {
  PilloAppearanceSettingsView,
  PilloHistoryEntryView,
  PilloIntakeView,
  PilloMedicationView,
  PilloScheduleRuleView,
  PilloSettingsView,
  PilloTab,
  PilloWeeklyScheduledIntakeView
} from './types';

import { TodayView } from './today-view';
import { MedicationsView } from './medications-view';
import { ScheduleView } from './schedule-view';
import { SettingsView } from './pillo-settings-view';

interface PilloAppShellProps {
  appearanceSettings: PilloAppearanceSettingsView;
  currentLocalDate: string;
  historyEntries: PilloHistoryEntryView[];
  intakes: PilloIntakeView[];
  medications: PilloMedicationView[];
  scheduleRules: PilloScheduleRuleView[];
  settings: PilloSettingsView;
  weeklyScheduledIntakes: PilloWeeklyScheduledIntakeView[];
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
  currentLocalDate,
  historyEntries,
  intakes,
  medications,
  scheduleRules,
  settings,
  weeklyScheduledIntakes
}: PilloAppShellProps) => {
  const t = useTranslations('Pillo');
  const { activeTab, setActiveTab } = usePilloTabs('home');
  const todayPendingCount = intakes.filter(item => item.status === 'PENDING').length;

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)),transparent_34%),hsl(var(--background))]">
      <div className="mx-auto flex h-full w-full max-w-md flex-col">
        <header className="z-20 border-b border-white/10 bg-[linear-gradient(110deg,hsl(var(--primary)/0.12)_0%,hsl(var(--background)/0.96)_45%,hsl(var(--background)/0.96)_55%,hsl(var(--accent)/0.15)_100%)] px-4 py-3 backdrop-blur-xl dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/app">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl transition-colors hover:bg-primary/10"
                >
                  <LayoutGrid className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                  {t('title')}
                </h1>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="rounded-full border border-primary/20 bg-primary/20 px-3 py-1 font-semibold text-primary shadow-sm shadow-primary/10"
            >
              {t('pendingCount', { count: todayPendingCount })}
            </Badge>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 pb-32">
          {activeTab === 'home' && (
            <TodayView
              currentLocalDate={currentLocalDate}
              historyEntries={historyEntries}
              intakes={intakes}
              medications={medications}
              weeklyScheduledIntakes={weeklyScheduledIntakes}
            />
          )}
          {activeTab === 'medications' && <MedicationsView medications={medications} />}
          {activeTab === 'schedule' && (
            <ScheduleView medications={medications} scheduleRules={scheduleRules} />
          )}
          {activeTab === 'settings' && (
            <SettingsView settings={settings} appearanceSettings={appearanceSettings} />
          )}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/20 bg-background/60 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur-3xl saturate-[1.8] dark:border-white/5">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.75rem] bg-black/5 p-1 dark:bg-white/5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.35rem] text-[11px] font-medium text-muted-foreground/80 transition-all duration-300',
                activeTab === tab.id &&
                  'bg-background/80 text-foreground shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-md'
              )}
            >
              <tab.icon
                className={cn(
                  'h-5 w-5 transition-transform duration-300',
                  activeTab === tab.id && 'scale-110'
                )}
              />
              <span className={cn('transition-all', activeTab === tab.id && 'font-semibold')}>
                {t(tab.labelKey)}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
