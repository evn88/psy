import { PaymentStatusBadge } from '@/components/payments/payment-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

interface MyPaymentHistoryItem {
  id: string;
  amountLabel: string;
  status: string;
  orderId: string;
  createdAtLabel: string;
  capturedAtLabel: string;
}

interface MyPaymentsHistoryProps {
  payments: MyPaymentHistoryItem[];
}

/**
 * История платежей пользователя в личном кабинете.
 */
export const MyPaymentsHistory = ({ payments }: MyPaymentsHistoryProps) => {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>История платежей</CardTitle>
        <CardDescription>
          Здесь отображаются локально сохранённые платежи после capture и последующей синхронизации
          webhook.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Создан</TableHead>
                <TableHead>Оплачен</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Пока нет проведённых оплат
                  </TableCell>
                </TableRow>
              ) : (
                payments.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.amountLabel}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{payment.orderId}</TableCell>
                    <TableCell>{payment.createdAtLabel}</TableCell>
                    <TableCell>{payment.capturedAtLabel}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
