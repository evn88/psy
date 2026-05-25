import Image from 'next/image';

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
      className={cn(
        'rounded-2xl border p-4 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 shrink-0 relative flex flex-col text-left',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border/60 bg-muted/5 text-muted-foreground hover:bg-muted/10'
      )}
    >
      {pkg.coverImage && (
        <div className="relative mb-3.5 h-28 w-full overflow-hidden rounded-xl bg-muted/30">
          <Image
            src={pkg.coverImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 hover:scale-105"
          />
        </div>
      )}
      <h4
        className={cn(
          'font-bold text-base mb-1.5 leading-snug',
          isSelected ? 'text-primary' : 'text-foreground'
        )}
      >
        {title}
      </h4>
      {description && (
        <p className="text-xs text-muted-foreground/80 mb-4 flex-1 leading-relaxed">
          {description}
        </p>
      )}
      <p
        className={cn(
          'text-xl font-bold tracking-tight mt-auto',
          isSelected ? 'text-primary' : 'text-foreground/90'
        )}
      >
        {formatPaymentAmount(pkg.amount, pkg.currency)}
      </p>
    </button>
  );
};
