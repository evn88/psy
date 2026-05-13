import { cn } from '@/lib/utils';

import { formatMedicationSummary, type DailyMedicationSummary } from './pillo-history-utils';

export const WeeklyMedicationBlock = ({
  items,
  label,
  toneClassName
}: {
  items: DailyMedicationSummary[];
  label: string;
  toneClassName: string;
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn('rounded-2xl border px-3 py-2.5', toneClassName)}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/75">
        {label}
      </p>
      <p className="mt-1 text-sm leading-snug text-foreground">{formatMedicationSummary(items)}</p>
    </div>
  );
};
