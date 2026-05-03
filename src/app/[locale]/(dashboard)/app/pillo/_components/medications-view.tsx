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
      <MedicationDialog>
        <Button className="h-12 w-full rounded-full">
          <Plus className="mr-2 h-4 w-4" />
          {t('medications.add')}
        </Button>
      </MedicationDialog>

      {medications.length === 0 ? (
        <EmptyState
          icon={Pill}
          title={t('medications.emptyTitle')}
          text={t('medications.emptyText')}
        />
      ) : (
        <div className="space-y-3">
          {medications.map(medication => (
            <MedicationCard key={medication.id} medication={medication} />
          ))}
        </div>
      )}
    </div>
  );
};
