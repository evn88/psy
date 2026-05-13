import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

import { PilloPendingIndicator } from './pillo-pending-indicator';
import type { PilloIntakeView } from './types';

export const IntakeUndoDialog = ({
  children,
  intake,
  isPending,
  pendingAction,
  onUndo
}: {
  children: ReactNode;
  intake: PilloIntakeView;
  isPending: boolean;
  pendingAction: 'skip' | 'take' | 'undo' | null;
  onUndo: (id: string) => void;
}) => {
  const t = useTranslations('Pillo');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-[1.75rem] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('today.undoTitle')}</DialogTitle>
          <DialogDescription>{t('today.undoDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-full font-bold"
            onClick={() => setOpen(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1 rounded-full font-bold"
            disabled={isPending}
            onClick={() => {
              onUndo(intake.id);
              setOpen(false);
            }}
          >
            {isPending && pendingAction === 'undo' ? (
              <PilloPendingIndicator label={t('today.undoPending')} />
            ) : (
              t('today.undoAction')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
