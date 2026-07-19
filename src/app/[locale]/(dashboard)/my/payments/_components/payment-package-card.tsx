import Image from 'next/image';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatPaymentAmount } from '@/modules/payments';

import type { PaymentServicePackage } from './payment-checkout.types';

const getLocalizedText = (value: Record<string, string> | null, locale: string, fallback = '') => {
  return value?.[locale] || value?.ru || fallback;
};

export const getPaymentPackageTitle = (pkg: PaymentServicePackage, locale: string) => {
  return getLocalizedText(pkg.title, locale, 'Пакет услуг');
};

export const PaymentPackageCard = ({
  isSelected,
  locale,
  onSelect,
  pkg
}: {
  isSelected: boolean;
  locale: string;
  onSelect: (pkg: PaymentServicePackage) => void;
  pkg: PaymentServicePackage;
}) => {
  const title = getPaymentPackageTitle(pkg, locale);
  const description = getLocalizedText(pkg.description, locale);

  return (
    <button
      type="button"
      onClick={() => onSelect(pkg)}
      aria-pressed={isSelected}
      className={cn(
        'relative grid min-h-28 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border/70 bg-card hover:border-primary/45 hover:bg-muted/30'
      )}
    >
      {pkg.coverImage && (
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted/50 sm:size-16">
          <Image src={pkg.coverImage} alt={title} fill sizes="64px" className="object-cover" />
        </div>
      )}
      <span className={cn('min-w-0', !pkg.coverImage && 'col-span-2')}>
        <span className="block font-semibold leading-5 text-foreground">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
          {description || `${pkg.includedMinutes} минут консультаций`}
        </span>
        {description ? (
          <span className="mt-1 block text-xs font-medium text-muted-foreground">
            {pkg.includedMinutes} минут консультаций
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-3 self-stretch">
        <span className="hidden text-right text-sm font-semibold tabular-nums text-foreground sm:block">
          {formatPaymentAmount(pkg.amount, pkg.currency)}
        </span>
        <span
          className={cn(
            'flex size-6 items-center justify-center rounded-full border',
            isSelected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/35 bg-background'
          )}
          aria-hidden
        >
          {isSelected ? <Check className="size-4" strokeWidth={2.5} /> : null}
        </span>
      </span>
      <span className="col-span-3 text-sm font-semibold tabular-nums text-foreground sm:hidden">
        {formatPaymentAmount(pkg.amount, pkg.currency)}
      </span>
    </button>
  );
};
