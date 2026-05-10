import { Pill, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { EmptyState } from './empty-state';
import { MedicationCard } from './medication-card';
import { MedicationDialog } from './medication-dialog';
import type { PilloMedicationView } from './types';

/**
 * Рисует список таблеток и форму добавления.
 * @param props - список таблеток.
 * @returns Экран справочника таблеток.
 */
export const MedicationsView = ({ medications }: { medications: PilloMedicationView[] }) => {
  const t = useTranslations('Pillo');

  return (
    <div className="space-y-4">
      {medications.length === 0 ? (
        <EmptyState
          icon={Pill}
          title={t('medications.emptyTitle')}
          text={t('medications.emptyText')}
        />
      ) : (
        <div className="space-y-3 pb-8">
          {medications.map(medication => (
            <MedicationCard key={medication.id} medication={medication} />
          ))}
        </div>
      )}

      <div className="fixed bottom-[5.5rem] left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-4 pointer-events-none">
        <MedicationDialog>
          <Button className="pointer-events-auto h-14 w-full rounded-full shadow-xl shadow-primary/20 text-base">
            <Plus className="mr-2 h-5 w-5 stroke-[2.5]" />
            {t('medications.add')}
          </Button>
        </MedicationDialog>
      </div>
    </div>
  );
};
