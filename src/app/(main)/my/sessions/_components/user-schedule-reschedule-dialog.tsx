'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslations, useLocale } from 'next-intl';
import { ru, enUS } from 'date-fns/locale';
import { Loader2, Calendar as CalendarIcon, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserEvent } from './use-user-events';

interface UserScheduleRescheduleDialogProps {
  eventId: string | null;
  events: UserEvent[];
  onClose: () => void;
  onConfirm: (oldId: string, newId: string) => Promise<void>;
}

export function UserScheduleRescheduleDialog({
  eventId,
  events,
  onClose,
  onConfirm
}: UserScheduleRescheduleDialogProps) {
  const t = useTranslations('My');
  const locale = useLocale();
  const dateLocale = locale === 'ru' ? ru : enUS;

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Available slots are FREE_SLOTs that are in the future
  const availableSlots = events
    .filter(e => e.type === 'FREE_SLOT' && !e.userId && new Date(e.start) > new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const handleConfirm = async () => {
    if (!eventId || !selectedSlotId) return;
    try {
      setIsLoading(true);
      await onConfirm(eventId, selectedSlotId);
      setSelectedSlotId(null);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedSlotId(null);
    onClose();
  };

  return (
    <Dialog open={!!eventId} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('rescheduleEventTitle')}</DialogTitle>
          <DialogDescription>{t('rescheduleEventDesc')}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <h4 className="text-sm font-medium mb-3">{t('selectNewTimeLabel')}</h4>
          {availableSlots.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg text-center">
              {t('noAvailableSlots')}
            </div>
          ) : (
            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-2">
                {availableSlots.map(slot => {
                  const startDate = new Date(slot.start);
                  const isSelected = selectedSlotId === slot.id;

                  return (
                    <div
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`
                        p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between
                        ${
                          isSelected
                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                            : 'bg-card hover:bg-muted/50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${isSelected ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'bg-muted'}`}
                        >
                          <CalendarIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p
                            className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : ''}`}
                          >
                            {format(startDate, 'd MMMM, EEEE', { locale: dateLocale })}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            {format(startDate, 'HH:mm')} - {format(new Date(slot.end), 'HH:mm')}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-600' : 'border-muted-foreground'}`}
                      >
                        {isSelected && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !selectedSlotId || availableSlots.length === 0}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('confirmRescheduleButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
