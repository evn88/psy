import { Pill } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { PilloHistoryEntryView } from './types';

export const HistoryEntryRow = ({ entry }: { entry: PilloHistoryEntryView }) => {
  const t = useTranslations('Pillo');

  return (
    <div className="flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-white/5 p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted/40">
        {entry.medicationPhotoUrl ? (
          <Image
            src={entry.medicationPhotoUrl}
            alt={entry.medicationName}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <Pill className="h-5 w-5 text-muted-foreground/60" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{entry.medicationName}</p>
          <Badge
            variant="secondary"
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
              entry.source === 'manual'
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            )}
          >
            {t(`history.source.${entry.source}`)}
          </Badge>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{entry.localTime}</span>
          <span>•</span>
          <span>
            {entry.doseUnits} x {entry.medicationDosage}
          </span>
        </div>
      </div>
    </div>
  );
};
