'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

interface UserScheduleCancelDialogProps {
  eventId: string | null;
  onClose: () => void;
  onConfirm: (id: string, reason: string) => Promise<void>;
  onRequestReschedule?: (id: string) => void;
}

export function UserScheduleCancelDialog({
  eventId,
  onClose,
  onConfirm,
  onRequestReschedule
}: UserScheduleCancelDialogProps) {
  const t = useTranslations('My');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);
      await onConfirm(eventId, reason);
      setReason('');
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Dialog open={!!eventId} onOpenChange={open => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('cancelEventTitle')}</DialogTitle>
          <DialogDescription>{t('cancelEventDesc')}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">{t('cancelReasonLabel')}</label>
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={t('cancelReasonPlaceholder')}
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t('keepEventButton')}
          </Button>
          {onRequestReschedule && (
            <Button
              variant="secondary"
              onClick={() => {
                if (eventId) onRequestReschedule(eventId);
              }}
              disabled={isLoading}
            >
              {t('rescheduleButton')}
            </Button>
          )}
          <Button variant="destructive" onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('confirmCancelButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
