'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

interface UserScheduleBookDialogProps {
  eventId: string | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export function UserScheduleBookDialog({
  eventId,
  onClose,
  onConfirm
}: UserScheduleBookDialogProps) {
  const t = useTranslations('My');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);
      await onConfirm(eventId);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={!!eventId} onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('confirmBookingTitle')}</DialogTitle>
          <DialogDescription>{t('confirmBookingDesc')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('confirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
