import { z } from 'zod';

export const ADMIN_WIDGET_TYPES = [
  'scheduleOverview',
  'paymentsOverview',
  'bookedUsers',
  'cancelledStats',
  'totalUsers',
  'onlineNow',
  'newUsers',
  'quickActions',
  'workflowBudget',
  'sentNotifications',
  'systemErrors',
  'completedSurveysAdmin',
  'notes'
] as const;

export const CLIENT_WIDGET_TYPES = [
  'pendingSurveys',
  'nextSession',
  'completedSurveys',
  'nextSteps',
  'accountOverview',
  'balance',
  'files',
  'notes'
] as const;

const widgetConfigSchema = z.object({
  id: z.string().trim().min(1).max(100),
  type: z.string().trim().min(1).max(100)
});

const dashboardConfigSchema = z
  .array(widgetConfigSchema)
  .max(20)
  .superRefine((widgets, context) => {
    const ids = new Set<string>();

    widgets.forEach((widget, index) => {
      if (ids.has(widget.id)) {
        context.addIssue({
          code: 'custom',
          message: 'Widget ids must be unique',
          path: [index, 'id']
        });
      }
      ids.add(widget.id);
    });
  });

export type WidgetConfig = z.infer<typeof widgetConfigSchema>;
export type DashboardScope = 'admin' | 'client';

/**
 * Перемещает виджет на позицию другого виджета после завершения перетаскивания.
 * Возвращает исходный массив, если перестановка не требуется или идентификатор не найден.
 * @param widgets - текущая раскладка дашборда.
 * @param activeId - идентификатор перемещаемого виджета.
 * @param overId - идентификатор виджета в позиции назначения.
 * @returns Новая раскладка либо исходный массив при отсутствии изменений.
 */
export const reorderDashboardWidgets = (
  widgets: WidgetConfig[],
  activeId: string,
  overId: string
): WidgetConfig[] => {
  if (activeId === overId) {
    return widgets;
  }

  const activeIndex = widgets.findIndex(widget => widget.id === activeId);
  const overIndex = widgets.findIndex(widget => widget.id === overId);

  if (activeIndex === -1 || overIndex === -1) {
    return widgets;
  }

  const reorderedWidgets = [...widgets];
  const [activeWidget] = reorderedWidgets.splice(activeIndex, 1);
  reorderedWidgets.splice(overIndex, 0, activeWidget);

  return reorderedWidgets;
};

/**
 * Проверяет конфигурацию дашборда и допустимые для него типы виджетов.
 * @param value - значение из клиента или JSON-поля базы данных.
 * @param allowedTypes - разрешённые типы виджетов для текущего раздела.
 * @returns Валидная конфигурация или `null`.
 */
export const parseDashboardConfig = (
  value: unknown,
  allowedTypes: readonly string[]
): WidgetConfig[] | null => {
  const result = dashboardConfigSchema.safeParse(value);

  if (!result.success || result.data.some(widget => !allowedTypes.includes(widget.type))) {
    return null;
  }

  return result.data;
};

const getAllowedTypes = (scope: DashboardScope): readonly string[] =>
  scope === 'admin' ? ADMIN_WIDGET_TYPES : CLIENT_WIDGET_TYPES;

/**
 * Извлекает раскладку нужного раздела из JSON-поля пользователя.
 * Поддерживает прежний формат, в котором раскладка хранилась непосредственно массивом.
 * @param value - содержимое JSON-поля пользователя.
 * @param scope - раздел дашборда.
 * @returns Валидная раскладка или `null`.
 */
export const getScopedDashboardConfig = (
  value: unknown,
  scope: DashboardScope
): WidgetConfig[] | null => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return parseDashboardConfig((value as Record<string, unknown>)[scope], getAllowedTypes(scope));
  }

  return parseDashboardConfig(value, getAllowedTypes(scope));
};

/**
 * Обновляет раскладку одного раздела, не удаляя валидную раскладку другого.
 * @param value - текущее содержимое JSON-поля пользователя.
 * @param scope - обновляемый раздел.
 * @param config - проверенная новая раскладка.
 * @returns Объект для сохранения в JSON-поле.
 */
export const setScopedDashboardConfig = (
  value: unknown,
  scope: DashboardScope,
  config: WidgetConfig[]
): Record<DashboardScope, WidgetConfig[] | null> => {
  return {
    admin: scope === 'admin' ? config : getScopedDashboardConfig(value, 'admin'),
    client: scope === 'client' ? config : getScopedDashboardConfig(value, 'client')
  };
};
