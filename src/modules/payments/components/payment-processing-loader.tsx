'use client';

import { CreditCard, ShieldCheck } from 'lucide-react';

export const PaymentProcessingLoader = () => {
  return (
    <div
      className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-primary/20 bg-primary/5 p-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="relative mb-6 flex size-16 items-center justify-center">
        {/* Animated concentric circles using Tailwind arbitrary values and animate-ping/pulse */}
        <div className="absolute inset-0 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-primary/30" />
        <div className="absolute inset-0 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-full bg-primary/40" />
        
        {/* Center Icon */}
        <div className="relative flex size-12 animate-[bounce_2s_infinite] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <CreditCard className="size-6" />
        </div>
      </div>

      <h3 className="mb-2 text-lg font-semibold text-foreground">Обработка платежа</h3>
      <p className="max-w-[280px] text-sm leading-relaxed text-muted-foreground">
        Пожалуйста, подождите. Мы защищенно связываемся с платежным шлюзом для подтверждения вашей оплаты.
      </p>

      <div className="mt-6 flex items-center justify-center gap-2 rounded-full bg-background/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
        <ShieldCheck className="size-4 text-emerald-500" />
        <span>Безопасное соединение</span>
      </div>
    </div>
  );
};
