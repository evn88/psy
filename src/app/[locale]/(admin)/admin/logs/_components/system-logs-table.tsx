'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

export interface SystemLogTableItem {
  id: string;
  category: string;
  level: string;
  source: string;
  operation: string | null;
  service: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  durationMs: number | null;
  initiatorIp: string | null;
  userAgent: string | null;
  requestId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  requestBody: unknown;
  responseBody: unknown;
  errorName: string | null;
  errorMessage: string | null;
  errorStack: string | null;
  errorDetails: unknown;
  createdAtLabel: string;
}

interface SystemLogsTableProps {
  logs: SystemLogTableItem[];
}

const DETAIL_CODE_BLOCK_CLASS =
  'max-h-80 max-w-full overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-xs [overflow-wrap:anywhere]';

/**
 * Возвращает variant бейджа по уровню записи.
 * @param level - Уровень системного журнала.
 * @returns Variant компонента Badge.
 */
const getLevelVariant = (level: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (level === 'ERROR') {
    return 'destructive';
  }

  if (level === 'WARN') {
    return 'outline';
  }

  return 'secondary';
};

/**
 * Форматирует JSON для диалога деталей.
 * @param value - Значение для отображения.
 * @returns Отформатированная строка.
 */
const formatJson = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '—';
  }

  return JSON.stringify(value, null, 2);
};

/**
 * Таблица системных логов с просмотром подробностей записи.
 */
export const SystemLogsTable = ({ logs }: SystemLogsTableProps) => {
  const [selectedLog, setSelectedLog] = useState<SystemLogTableItem | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead>Уровень</TableHead>
              <TableHead>Метод</TableHead>
              <TableHead>Путь / операция</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Пользователь</TableHead>
              <TableHead className="text-right">Детали</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  Записи журнала не найдены
                </TableCell>
              </TableRow>
            ) : (
              logs.map(log => (
                <TableRow key={log.id} className="align-top">
                  <TableCell className="whitespace-nowrap">{log.createdAtLabel}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getLevelVariant(log.level)}>{log.level}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.method ?? '—'}</TableCell>
                  <TableCell className="max-w-sm">
                    <div className="truncate font-mono text-xs">
                      {log.path ?? log.operation ?? log.source}
                    </div>
                    {log.errorMessage ? (
                      <div className="truncate text-xs text-destructive">{log.errorMessage}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{log.statusCode ?? '—'}</span>
                    {log.durationMs !== null ? (
                      <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground">
                        {log.durationMs} мс
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.initiatorIp ?? '—'}</TableCell>
                  <TableCell>
                    {log.user ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{log.user.name ?? 'Без имени'}</span>
                        <span className="text-xs text-muted-foreground">{log.user.email}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Не авторизован</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                      Детали
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={selectedLog !== null} onOpenChange={open => !open && setSelectedLog(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Детали записи журнала</DialogTitle>
            <DialogDescription>
              {selectedLog?.category} · {selectedLog?.createdAtLabel}
            </DialogDescription>
          </DialogHeader>

          {selectedLog ? (
            <div className="min-w-0 space-y-4">
              <div className="grid gap-3 rounded-lg border p-4 text-sm md:grid-cols-2">
                <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-muted-foreground">Источник:</span> {selectedLog.source}
                </div>
                <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-muted-foreground">Сервис:</span>{' '}
                  {selectedLog.service ?? '—'}
                </div>
                <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-muted-foreground">Операция:</span>{' '}
                  {selectedLog.operation ?? '—'}
                </div>
                <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-muted-foreground">Request ID:</span>{' '}
                  {selectedLog.requestId ?? '—'}
                </div>
                <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-muted-foreground">User-Agent:</span>{' '}
                  {selectedLog.userAgent ?? '—'}
                </div>
                <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-muted-foreground">Длительность:</span>{' '}
                  {selectedLog.durationMs ?? '—'} мс
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="min-w-0">
                  <h3 className="mb-2 font-semibold">Request body</h3>
                  <pre className={DETAIL_CODE_BLOCK_CLASS}>
                    {formatJson(selectedLog.requestBody)}
                  </pre>
                </div>
                <div className="min-w-0">
                  <h3 className="mb-2 font-semibold">Response body</h3>
                  <pre className={DETAIL_CODE_BLOCK_CLASS}>
                    {formatJson(selectedLog.responseBody)}
                  </pre>
                </div>
              </div>

              <div className="min-w-0">
                <h3 className="mb-2 font-semibold">Ошибка</h3>
                <pre className={DETAIL_CODE_BLOCK_CLASS}>
                  {formatJson({
                    name: selectedLog.errorName,
                    message: selectedLog.errorMessage,
                    details: selectedLog.errorDetails,
                    stack: selectedLog.errorStack
                  })}
                </pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
