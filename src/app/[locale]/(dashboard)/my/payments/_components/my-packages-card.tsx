'use client';

import { History, PackageCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

type PurchasedPackageStatus = 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED';

export interface PurchasedPackageView {
  id: string;
  title: string;
  purchasedAtLabel: string;
  remainingMinutes: number;
  status: PurchasedPackageStatus;
  totalMinutes: number;
  amountLabel: string;
}

interface MyPackagesCardProps {
  activePackages: PurchasedPackageView[];
  historyPackages: PurchasedPackageView[];
}

const packageStatusLabels: Record<PurchasedPackageStatus, string> = {
  ACTIVE: 'Активен',
  EXHAUSTED: 'Использован',
  EXPIRED: 'Срок истёк',
  SUSPENDED: 'Приостановлен',
  REVOKED: 'Отменён'
};

const PackageRow = ({ purchasedPackage }: { purchasedPackage: PurchasedPackageView }) => (
  <li className="grid gap-2 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
    <div className="min-w-0">
      <p className="font-medium">{purchasedPackage.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Куплен {purchasedPackage.purchasedAtLabel} &middot; {purchasedPackage.amountLabel}
      </p>
    </div>
    <div className="flex items-center gap-3 sm:justify-end">
      <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        {packageStatusLabels[purchasedPackage.status]}
      </span>
      <p className="text-sm font-semibold tabular-nums">
        {purchasedPackage.remainingMinutes}{' '}
        <span className="font-normal text-muted-foreground">
          из {purchasedPackage.totalMinutes} мин.
        </span>
      </p>
    </div>
  </li>
);

/** Показывает активные пакеты и переносит неактивные записи в историю. */
export const MyPackagesCard = ({ activePackages, historyPackages }: MyPackagesCardProps) => (
  <section
    className="overflow-hidden rounded-2xl border bg-card shadow-sm"
    aria-labelledby="my-packages-title"
  >
    <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
          <PackageCheck className="size-4" aria-hidden />
        </span>
        <div>
          <h2 id="my-packages-title" className="font-semibold">
            Мои пакеты
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Оставшееся время консультаций</p>
        </div>
      </div>

      {historyPackages.length > 0 ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              <History className="size-4" aria-hidden />
              История
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-2xl border-border/60 p-0 sm:max-w-xl">
            <DialogHeader className="border-b px-5 py-5 text-left sm:px-6">
              <DialogTitle>История пакетов</DialogTitle>
              <DialogDescription>
                Использованные и недоступные для оплаты консультаций пакеты.
              </DialogDescription>
            </DialogHeader>
            <ul className="divide-y overflow-y-auto">
              {historyPackages.map(purchasedPackage => (
                <PackageRow key={purchasedPackage.id} purchasedPackage={purchasedPackage} />
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>

    {activePackages.length > 0 ? (
      <ul className="border-t divide-y">
        {activePackages.map(purchasedPackage => (
          <PackageRow key={purchasedPackage.id} purchasedPackage={purchasedPackage} />
        ))}
      </ul>
    ) : (
      <p className="border-t px-5 py-4 text-sm text-muted-foreground sm:px-6">
        Нет активных пакетов.
      </p>
    )}
  </section>
);
