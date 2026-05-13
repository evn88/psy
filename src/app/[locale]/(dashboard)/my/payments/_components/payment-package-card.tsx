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
        'rounded-xl border p-4 cursor-pointer transition-all hover:border-primary shrink-0 relative flex flex-col text-left',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border/60 bg-muted/10 text-muted-foreground'
      )}
    >
      {pkg.coverImage && (
        <div className="relative mb-3 h-24 w-full overflow-hidden rounded-md bg-muted">
          <Image
            src={pkg.coverImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
      )}
      <h4
        className={cn(
          'font-semibold text-base mb-1',
          isSelected ? 'text-primary' : 'text-foreground'
        )}
      >
        {title}
      </h4>
      {description && <p className="text-xs text-muted-foreground mb-3 flex-1">{description}</p>}
      <p className={cn('text-lg font-bold', isSelected ? 'text-primary' : 'text-foreground')}>
        {formatPaymentAmount(pkg.amount, pkg.currency)}
      </p>
    </button>
  );
};
