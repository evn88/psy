'use client';

import { useTransition } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PaymentsSyncButtonProps {
  paymentIds: string[];
  userId?: string;
}

/**
 * Кнопка ручной сверки локальных платежей с PayPal API.
 */
export const PaymentsSyncButton = ({ paymentIds, userId }: PaymentsSyncButtonProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSync = () => {
    startTransition(async () => {
      const response = await fetch('/api/admin/payments/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentIds,
          userId
        })
      });

      const payload = (await response.json()) as {
        successCount?: number;
        failedCount?: number;
        message?: string;
      };

      if (!response.ok) {
        toast.error(payload.message || 'Не удалось выполнить сверку платежей');
        return;
      }

      toast.success(
        `Сверка завершена: успешно ${payload.successCount ?? 0}, ошибок ${payload.failedCount ?? 0}`
      );
      router.refresh();
    });
  };

  return (
    <Button onClick={handleSync} disabled={isPending || paymentIds.length === 0} variant="outline">
      <RefreshCcw className={isPending ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
      {isPending ? 'Сверяю...' : 'Сверить с PayPal'}
    </Button>
  );
};
