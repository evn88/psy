'use client';

import { useEffect, useState, useTransition } from 'react';
import { ExternalLink, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';

import { refundPaymentAction } from '@/app/[locale]/(admin)/admin/payments/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { PaymentStatusBadge } from '@/modules/payments/components/payment-status-badge';
import { PaymentsSyncButton } from '@/modules/payments/components/payments-sync-button';

export type FinancialHistoryDirection = 'INCOME' | 'EXPENSE' | 'REFUND' | 'NEUTRAL';

export interface FinancialHistoryItem {
  id: string;
  paymentId: string | null;
  clientId: string;
  clientName: string;
  clientEmail: string;
  provider: string | null;
  status: string;
  statusGroup: 'SUCCESS' | 'FAILED' | 'PENDING';
  direction: FinancialHistoryDirection;
  unit: 'EUR' | 'MINUTES';
  amountValue: number;
  amountLabel: string;
  createdAtLabel: string;
  createdAtIso: string;
  title: string;
  refundable: boolean;
  details: Array<{ label: string; value: string }>;
}

interface PersistedFilters {
  query: string;
  status: 'ALL' | 'SUCCESS' | 'FAILED' | 'PENDING';
  provider: string;
  direction: 'ALL' | FinancialHistoryDirection;
  minAmount: string;
  maxAmount: string;
}

interface FinancialHistoryTableProps {
  items: FinancialHistoryItem[];
  storageKey: string;
  showClient?: boolean;
}

const DEFAULT_FILTERS: PersistedFilters = {
  query: '',
  status: 'ALL',
  provider: 'ALL',
  direction: 'ALL',
  minAmount: '',
  maxAmount: ''
};

const readFilters = (storageKey: string): PersistedFilters => {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored
      ? {
          ...DEFAULT_FILTERS,
          ...(JSON.parse(stored) as Partial<PersistedFilters>),
          query: ''
        }
      : DEFAULT_FILTERS;
  } catch {
    return DEFAULT_FILTERS;
  }
};

/**
 * Упрощённая финансовая таблица: ключевые поля в строке, детали и действия — в модальном окне.
 */
export const FinancialHistoryTable = ({
  items,
  storageKey,
  showClient = true
}: FinancialHistoryTableProps) => {
  const router = useRouter();
  const [filters, setFilters] = useState<PersistedFilters>(DEFAULT_FILTERS);
  const [selectedItem, setSelectedItem] = useState<FinancialHistoryItem | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFilters(readFilters(storageKey));
  }, [storageKey]);

  useEffect(() => {
    const { query: _query, ...persistedFilters } = filters;
    window.localStorage.setItem(storageKey, JSON.stringify(persistedFilters));
  }, [filters, storageKey]);

  const providers = Array.from(
    new Set(items.flatMap(item => (item.provider ? [item.provider] : [])))
  ).sort();
  const normalizedQuery = filters.query.trim().toLowerCase();
  const minimum = filters.minAmount ? Number(filters.minAmount) : null;
  const maximum = filters.maxAmount ? Number(filters.maxAmount) : null;
  const filteredItems = items.filter(item => {
    const absoluteAmount = Math.abs(item.amountValue);

    if (filters.status !== 'ALL' && item.statusGroup !== filters.status) return false;
    if (filters.provider !== 'ALL' && item.provider !== filters.provider) return false;
    if (filters.direction !== 'ALL' && item.direction !== filters.direction) return false;
    if (minimum !== null && Number.isFinite(minimum)) {
      if (item.unit !== 'EUR' || absoluteAmount < minimum) return false;
    }
    if (maximum !== null && Number.isFinite(maximum)) {
      if (item.unit !== 'EUR' || absoluteAmount > maximum) return false;
    }
    if (
      normalizedQuery &&
      !`${item.id} ${item.clientName} ${item.clientEmail} ${item.title}`
        .toLowerCase()
        .includes(normalizedQuery)
    ) {
      return false;
    }

    return true;
  });

  const updateFilter = <TKey extends keyof PersistedFilters>(
    key: TKey,
    value: PersistedFilters[TKey]
  ) => {
    setFilters(current => ({ ...current, [key]: value }));
  };

  const handleRefund = (item: FinancialHistoryItem) => {
    if (!item.paymentId) return;

    startTransition(async () => {
      const result = await refundPaymentAction(item.paymentId!, crypto.randomUUID());

      if (result.success) {
        toast.success(result.message);
        setSelectedItem(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_160px_160px_120px_120px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={event => updateFilter('query', event.target.value)}
            placeholder="ID, клиент или операция"
            className="pl-9"
          />
        </div>
        <Select
          value={filters.status}
          onValueChange={value => updateFilter('status', value as PersistedFilters['status'])}
        >
          <SelectTrigger aria-label="Статус">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все статусы</SelectItem>
            <SelectItem value="SUCCESS">Успешные</SelectItem>
            <SelectItem value="FAILED">Неуспешные</SelectItem>
            <SelectItem value="PENDING">В ожидании</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.provider} onValueChange={value => updateFilter('provider', value)}>
          <SelectTrigger aria-label="Провайдер">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все провайдеры</SelectItem>
            {providers.map(provider => (
              <SelectItem key={provider} value={provider}>
                {provider}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.direction}
          onValueChange={value => updateFilter('direction', value as PersistedFilters['direction'])}
        >
          <SelectTrigger aria-label="Тип движения">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все движения</SelectItem>
            <SelectItem value="INCOME">Приходы</SelectItem>
            <SelectItem value="EXPENSE">Расходы</SelectItem>
            <SelectItem value="REFUND">Возвраты</SelectItem>
            <SelectItem value="NEUTRAL">Без проводки</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={filters.minAmount}
          onChange={event => updateFilter('minAmount', event.target.value)}
          placeholder="Сумма от"
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          value={filters.maxAmount}
          onChange={event => updateFilter('maxAmount', event.target.value)}
          placeholder="Сумма до"
        />
        <Button variant="ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
          Сбросить
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              {showClient && <TableHead>Клиент</TableHead>}
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showClient ? 5 : 4}
                  className="h-28 text-center text-muted-foreground"
                >
                  Операции не найдены
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map(item => (
                <TableRow
                  key={item.id}
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedItem(item);
                    }
                  }}
                >
                  {showClient && (
                    <TableCell>
                      <p className="font-medium">{item.clientName}</p>
                      <p className="text-xs text-muted-foreground">{item.clientEmail}</p>
                    </TableCell>
                  )}
                  <TableCell
                    className={cn(
                      'font-semibold tabular-nums',
                      item.direction === 'INCOME' && 'text-emerald-600 dark:text-emerald-400',
                      (item.direction === 'EXPENSE' || item.direction === 'REFUND') &&
                        'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {item.amountLabel}
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="max-w-48 truncate font-mono text-xs">{item.id}</TableCell>
                  <TableCell className="whitespace-nowrap">{item.createdAtLabel}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Показано {filteredItems.length} из {items.length}. Фильтры сохранены в этом браузере.
      </p>

      <Dialog open={Boolean(selectedItem)} onOpenChange={open => !open && setSelectedItem(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.title}</DialogTitle>
                <DialogDescription>
                  {selectedItem.createdAtLabel} · {selectedItem.id}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Сумма</p>
                  <p
                    className={cn(
                      'mt-1 text-xl font-semibold',
                      selectedItem.direction === 'INCOME' && 'text-emerald-600',
                      (selectedItem.direction === 'EXPENSE' ||
                        selectedItem.direction === 'REFUND') &&
                        'text-rose-600'
                    )}
                  >
                    {selectedItem.amountLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Статус</p>
                  <div className="mt-1">
                    <PaymentStatusBadge status={selectedItem.status} />
                  </div>
                </div>
                {selectedItem.details.map(detail => (
                  <div key={detail.label}>
                    <p className="text-xs text-muted-foreground">{detail.label}</p>
                    <p className="mt-1 break-all text-sm">{detail.value}</p>
                  </div>
                ))}
              </div>

              <DialogFooter className="flex-wrap sm:justify-between">
                <Button asChild variant="outline">
                  <Link href={`/admin/clients/${selectedItem.clientId}`}>
                    <ExternalLink />
                    Карточка клиента
                  </Link>
                </Button>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.paymentId && (
                    <PaymentsSyncButton compact paymentIds={[selectedItem.paymentId]} />
                  )}
                  {selectedItem.refundable && (
                    <Button
                      variant="destructive"
                      disabled={isPending}
                      onClick={() => handleRefund(selectedItem)}
                    >
                      <RotateCcw />
                      {isPending ? 'Оформляем…' : 'Вернуть платёж'}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
