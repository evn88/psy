import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { ConfettiBurst } from './confetti-burst';
import { getWeeklyDayTone, type WeeklyDaySummary } from './pillo-history-utils';

export const WeeklyProgressRing = ({ day }: { day: WeeklyDaySummary }) => {
  const t = useTranslations('Pillo');
  const tone = getWeeklyDayTone(day);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(Math.max(day.adherencePercent, 0), 100);
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;
  const isPerfectDay =
    day.plannedCount > 0 && day.takenCount === day.plannedCount && day.pendingCount === 0;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20">
        <svg
          viewBox="0 0 80 80"
          className="-rotate-90 h-full w-full drop-shadow-[0_8px_18px_rgba(0,0,0,0.12)]"
          aria-hidden
        >
          <circle
            cx="40"
            cy="40"
            r={radius}
            strokeWidth="8"
            className={cn('fill-none', tone.trackClassName)}
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            strokeWidth="8"
            strokeLinecap="round"
            className={cn('fill-none transition-all duration-500', tone.progressClassName)}
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[0.95rem] font-black tracking-tight text-foreground sm:text-[1.05rem]">
            {clampedPercent}%
          </span>
        </div>

        {isPerfectDay && <ConfettiBurst />}
      </div>

      {isPerfectDay && (
        <Badge className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
          {t('history.weeklyPerfectDay')}
        </Badge>
      )}
    </div>
  );
};
