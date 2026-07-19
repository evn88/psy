'use client';

import { useState, useTransition } from 'react';
import { Minus, Plus, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  adjustPurchasedPackageAction,
  adjustWalletBalanceAction,
  updateConsultationRateAction
} from '../actions';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/navigation';

export interface FinancialClientOption {
  id: string;
  name: string;
  email: string;
  balance: string;
}

export interface PurchasedPackageItem {
  id: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  title: string;
  status: string;
  totalMinutes: number;
  remainingMinutes: number;
  purchasedAt: string;
}

export const ConsultationRateCard = ({ initialAmount }: { initialAmount: string }) => {
  const router = useRouter();
  const [amount, setAmount] = useState(initialAmount);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await updateConsultationRateAction(amount);
      result.success ? toast.success(result.message) : toast.error(result.message);
      if (result.success) router.refresh();
    });
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm font-medium">Стоимость 60 минут консультации</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Списывается с внутреннего счёта пропорционально длительности встречи.
      </p>
      <div className="mt-4 flex max-w-sm gap-2">
        <div className="relative flex-1">
          <Input
            aria-label="Стоимость 60 минут консультации"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={event => setAmount(event.target.value)}
            className="pr-14"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            EUR
          </span>
        </div>
        <Button disabled={isPending} onClick={submit}>
          {isPending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
};

export const WalletAdjustmentDialog = ({
  clients,
  defaultClientId,
  children
}: {
  clients: FinancialClientOption[];
  defaultClientId?: string;
  children: React.ReactNode;
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(defaultClientId || '');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const selectedClient = clients.find(client => client.id === userId);

  const submit = () => {
    startTransition(async () => {
      const result = await adjustWalletBalanceAction({
        userId,
        amount,
        reason,
        idempotencyKey: crypto.randomUUID()
      });

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setAmount('');
        setReason('');
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Корректировка EUR-баланса</DialogTitle>
          <DialogDescription>
            Положительная сумма пополнит счёт, отрицательная — спишет средства. Операция попадёт в
            ledger и клиент получит письмо.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Клиент</Label>
            <Select value={userId} onValueChange={setUserId} disabled={Boolean(defaultClientId)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите клиента" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} · {client.balance} EUR
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClient && (
              <p className="text-xs text-muted-foreground">{selectedClient.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="wallet-adjustment-amount">Изменение баланса</Label>
            <Input
              id="wallet-adjustment-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              placeholder="+100.00 или -25.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wallet-adjustment-reason">Причина</Label>
            <Textarea
              id="wallet-adjustment-reason"
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder="Не менее трёх символов"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button disabled={isPending || !userId} onClick={submit}>
            {isPending ? 'Сохраняем…' : 'Применить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PackageAdjustmentDialog = ({ item }: { item: PurchasedPackageItem }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await adjustPurchasedPackageAction({
        userId: item.userId,
        purchasedPackageId: item.id,
        minutes: Number(minutes),
        reason,
        idempotencyKey: crypto.randomUUID()
      });

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setMinutes('');
        setReason('');
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 />
          Скорректировать
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription>
            Сейчас доступно {item.remainingMinutes} из {item.totalMinutes} минут. Используйте знак
            «минус» для списания.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`package-minutes-${item.id}`}>Изменение минут</Label>
            <Input
              id={`package-minutes-${item.id}`}
              type="number"
              step="1"
              value={minutes}
              onChange={event => setMinutes(event.target.value)}
              placeholder="+60 или -30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`package-reason-${item.id}`}>Причина</Label>
            <Textarea
              id={`package-reason-${item.id}`}
              value={reason}
              onChange={event => setReason(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button disabled={isPending} onClick={submit}>
            {isPending ? 'Сохраняем…' : 'Применить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const PurchasedPackagesTable = ({ items }: { items: PurchasedPackageItem[] }) => {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Клиент</TableHead>
            <TableHead>Пакет</TableHead>
            <TableHead>Остаток</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Куплен</TableHead>
            <TableHead className="text-right">Управление</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                Купленных пакетов пока нет
              </TableCell>
            </TableRow>
          ) : (
            items.map(item => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium">{item.clientName}</p>
                  <p className="text-xs text-muted-foreground">{item.clientEmail}</p>
                </TableCell>
                <TableCell>{item.title}</TableCell>
                <TableCell className="font-medium tabular-nums">
                  {item.remainingMinutes} / {item.totalMinutes} мин.
                </TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell>{item.purchasedAt}</TableCell>
                <TableCell className="text-right">
                  <PackageAdjustmentDialog item={item} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export const BalanceAdjustmentButton = ({
  clients,
  defaultClientId
}: {
  clients: FinancialClientOption[];
  defaultClientId?: string;
}) => (
  <WalletAdjustmentDialog clients={clients} defaultClientId={defaultClientId}>
    <Button>
      {defaultClientId ? <Settings2 /> : <Plus />}
      Корректировать баланс
    </Button>
  </WalletAdjustmentDialog>
);
