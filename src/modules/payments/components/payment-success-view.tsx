'use client';

import { CheckCircle2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentSuccessViewProps {
  onReset: () => void;
}

export const PaymentSuccessView = ({ onReset }: PaymentSuccessViewProps) => {
  return (
    <div
      className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center animate-in fade-in zoom-in-95"
      role="status"
      aria-live="polite"
    >
      <div className="relative mb-6 flex size-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-emerald-500/20" />
        <div className="absolute inset-0 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_1] rounded-full bg-emerald-500/40" />
        
        <div className="relative flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
          <CheckCircle2 className="size-6" />
        </div>
      </div>

      <h3 className="mb-2 text-lg font-semibold text-foreground">Платёж успешно завершён</h3>
      <p className="max-w-[280px] text-sm leading-relaxed text-muted-foreground">
        Средства были зачислены на ваш баланс. Вы можете закрыть это окно или совершить новый платёж.
      </p>

      <Button onClick={onReset} variant="outline" className="mt-6 gap-2">
        <RefreshCcw className="size-4" />
        Оплатить снова
      </Button>
    </div>
  );
};
