import { Prisma, SystemLogCategory, SystemLogLevel } from '@prisma/client';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from '@/i18n/navigation';
import prisma from '@/lib/prisma';
import { getSystemLogSettings } from '@/modules/system-logs/system-log-settings.server';
import { LogFilterMultiSelect } from './_components/log-filter-multi-select';
import { SystemLogSettingsForm } from './_components/system-log-settings-form';
import { SystemLogsTable } from './_components/system-logs-table';

interface SystemLogsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const TAKE_LIMIT = 100;

type SystemLogWithUser = Prisma.SystemLogEntryGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

/**
 * Возвращает одиночное значение query-параметра.
 * @param value - Значение из searchParams.
 * @returns Строка или `undefined`.
 */
const getSearchValue = (value: string | string[] | undefined): string | undefined => {
  return Array.isArray(value) ? value[0] : value;
};

/**
 * Возвращает все значения query-параметра.
 * @param value - Значение из searchParams.
 * @returns Массив непустых строк.
 */
const getSearchValues = (value: string | string[] | undefined): string[] => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.map(item => item.trim()).filter(Boolean);
};

/**
 * Проверяет, что query-параметр является категорией журнала.
 * @param value - Query-значение.
 * @returns Категория журнала или `undefined`.
 */
const parseCategory = (value: string | undefined): SystemLogCategory | undefined => {
  return Object.values(SystemLogCategory).includes(value as SystemLogCategory)
    ? (value as SystemLogCategory)
    : undefined;
};

/**
 * Возвращает валидные категории из query-параметров.
 * @param value - Query-значение.
 * @returns Список категорий системного журнала.
 */
const parseCategories = (value: string | string[] | undefined): SystemLogCategory[] => {
  return getSearchValues(value).flatMap(item => {
    const category = parseCategory(item);
    return category ? [category] : [];
  });
};

/**
 * Проверяет, что query-параметр является уровнем журнала.
 * @param value - Query-значение.
 * @returns Уровень журнала или `undefined`.
 */
const parseLevel = (value: string | undefined): SystemLogLevel | undefined => {
  return Object.values(SystemLogLevel).includes(value as SystemLogLevel)
    ? (value as SystemLogLevel)
    : undefined;
};

/**
 * Возвращает валидные уровни из query-параметров.
 * @param value - Query-значение.
 * @returns Список уровней системного журнала.
 */
const parseLevels = (value: string | string[] | undefined): SystemLogLevel[] => {
  return getSearchValues(value).flatMap(item => {
    const level = parseLevel(item);
    return level ? [level] : [];
  });
};

/**
 * Безопасно парсит HTTP status из query-параметра.
 * @param value - Query-значение.
 * @returns HTTP status или `undefined`.
 */
const parseStatusCode = (value: string | string[] | undefined): number | undefined => {
  const rawValue = getSearchValue(value)?.trim();

  if (!rawValue) {
    return undefined;
  }

  const parsed = Number(rawValue);
  return Number.isInteger(parsed) ? parsed : undefined;
};

/**
 * Собирает Prisma where для фильтров страницы журнала.
 * @param params - Query-параметры страницы.
 * @returns Prisma where.
 */
const buildWhere = (params: Record<string, string | string[] | undefined>) => {
  const categories = parseCategories(params.category);
  const levels = parseLevels(params.level);
  const statusCode = parseStatusCode(params.statusCode);
  const search = getSearchValue(params.search)?.trim();
  const ip = getSearchValue(params.ip)?.trim();
  const user = getSearchValue(params.user)?.trim();

  const where: Prisma.SystemLogEntryWhereInput = {
    category: categories.length > 0 ? { in: categories } : undefined,
    level: levels.length > 0 ? { in: levels } : undefined,
    statusCode,
    initiatorIp: ip ? { contains: ip, mode: 'insensitive' } : undefined
  };

  if (search) {
    where.OR = [
      { path: { contains: search, mode: 'insensitive' } },
      { operation: { contains: search, mode: 'insensitive' } },
      { service: { contains: search, mode: 'insensitive' } },
      { source: { contains: search, mode: 'insensitive' } },
      { errorMessage: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (user) {
    where.user = {
      OR: [
        { email: { contains: user, mode: 'insensitive' } },
        { name: { contains: user, mode: 'insensitive' } }
      ]
    };
  }

  return where;
};

/**
 * Страница просмотра системных логов.
 */
export default async function SystemLogsPage({ searchParams }: SystemLogsPageProps) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    redirect('/auth');
  }

  const params = (await searchParams) ?? {};
  const settings = await getSystemLogSettings();
  const logs = await prisma.systemLogEntry.findMany({
    where: buildWhere(params),
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: TAKE_LIMIT
  });

  const tableItems = (logs as SystemLogWithUser[]).map(log => ({
    id: log.id,
    category: log.category,
    level: log.level,
    source: log.source,
    operation: log.operation,
    service: log.service,
    method: log.method,
    path: log.path,
    statusCode: log.statusCode,
    durationMs: log.durationMs,
    initiatorIp: log.initiatorIp,
    userAgent: log.userAgent,
    requestId: log.requestId,
    user: log.user,
    requestBody: log.requestBody,
    responseBody: log.responseBody,
    errorName: log.errorName,
    errorMessage: log.errorMessage,
    errorStack: log.errorStack,
    errorDetails: log.errorDetails,
    createdAtLabel: log.createdAt.toLocaleString('ru-RU')
  }));
  const errorCount = tableItems.filter(log => log.level === 'ERROR').length;
  const warnCount = tableItems.filter(log => log.level === 'WARN').length;
  const apiCount = tableItems.filter(log => log.category === 'API').length;
  const selectedCategories = parseCategories(params.category);
  const selectedLevels = parseLevels(params.level);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Системный журнал</h2>
        <p className="text-muted-foreground">
          API-запросы, ошибки AI и ошибки платежных интеграций с IP инициатора и пользователем.
        </p>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-[360px]">
          <TabsTrigger value="logs">Журнал</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Показано записей</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tableItems.length}</div>
                <p className="text-xs text-muted-foreground">Последние {TAKE_LIMIT} по фильтру</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ошибки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{errorCount}</div>
                <p className="text-xs text-muted-foreground">Уровень ERROR</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">API / WARN</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {apiCount} / {warnCount}
                </div>
                <p className="text-xs text-muted-foreground">В текущей выборке</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Фильтры</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                <div className="space-y-2">
                  <Label htmlFor="system-log-search">Поиск</Label>
                  <Input
                    id="system-log-search"
                    name="search"
                    defaultValue={getSearchValue(params.search)}
                    placeholder="Путь, операция, ошибка"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="system-log-ip">IP</Label>
                  <Input
                    id="system-log-ip"
                    name="ip"
                    defaultValue={getSearchValue(params.ip)}
                    placeholder="192.0.2.10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="system-log-user">Пользователь</Label>
                  <Input
                    id="system-log-user"
                    name="user"
                    defaultValue={getSearchValue(params.user)}
                    placeholder="email или имя"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Категории</Label>
                  <LogFilterMultiSelect
                    name="category"
                    options={Object.values(SystemLogCategory)}
                    selectedValues={selectedCategories}
                    placeholder="Все категории"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Уровни</Label>
                  <LogFilterMultiSelect
                    name="level"
                    options={Object.values(SystemLogLevel)}
                    selectedValues={selectedLevels}
                    placeholder="Все уровни"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="system-log-status">HTTP status</Label>
                  <Input
                    id="system-log-status"
                    name="statusCode"
                    defaultValue={getSearchValue(params.statusCode)}
                    placeholder="500"
                  />
                </div>
                <div className="flex gap-2 md:col-span-3 xl:col-span-6">
                  <Button type="submit">Применить</Button>
                  <Button variant="outline" asChild>
                    <Link href="/admin/logs">Сбросить</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Последние записи</CardTitle>
            </CardHeader>
            <CardContent>
              <SystemLogsTable logs={tableItems} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <SystemLogSettingsForm
            initialSettings={{
              apiRequestsEnabled: settings.apiRequestsEnabled,
              aiErrorsEnabled: settings.aiErrorsEnabled,
              paymentErrorsEnabled: settings.paymentErrorsEnabled,
              retentionDays: settings.retentionDays
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
