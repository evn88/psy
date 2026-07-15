import { describe, expect, it } from 'vitest';

import {
  CLIENT_WIDGET_TYPES,
  getScopedDashboardConfig,
  parseDashboardConfig,
  reorderDashboardWidgets,
  setScopedDashboardConfig
} from '@/lib/dashboard-config';

describe('parseDashboardConfig', () => {
  it('возвращает валидную конфигурацию', () => {
    const config = [{ id: 'surveys', type: 'pendingSurveys' }];

    expect(parseDashboardConfig(config, CLIENT_WIDGET_TYPES)).toEqual(config);
  });

  it('отклоняет неизвестный тип виджета', () => {
    const config = [{ id: 'unknown', type: 'unknownWidget' }];

    expect(parseDashboardConfig(config, CLIENT_WIDGET_TYPES)).toBeNull();
  });

  it('отклоняет повторяющиеся идентификаторы', () => {
    const config = [
      { id: 'same', type: 'pendingSurveys' },
      { id: 'same', type: 'notes' }
    ];

    expect(parseDashboardConfig(config, CLIENT_WIDGET_TYPES)).toBeNull();
  });
});

describe('reorderDashboardWidgets', () => {
  const layout = [
    { id: 'first', type: 'pendingSurveys' },
    { id: 'second', type: 'nextSession' },
    { id: 'third', type: 'notes' }
  ];

  it('перемещает виджет на выбранную позицию', () => {
    expect(reorderDashboardWidgets(layout, 'first', 'third')).toEqual([
      layout[1],
      layout[2],
      layout[0]
    ]);
  });

  it('сохраняет ссылку на раскладку, когда перестановка не требуется', () => {
    expect(reorderDashboardWidgets(layout, 'first', 'first')).toBe(layout);
    expect(reorderDashboardWidgets(layout, 'missing', 'second')).toBe(layout);
  });
});

describe('scoped dashboard config', () => {
  it('хранит раскладки личного кабинета и админки независимо', () => {
    const admin = [{ id: 'admin', type: 'totalUsers' }];
    const client = [{ id: 'client', type: 'pendingSurveys' }];
    const withAdmin = setScopedDashboardConfig(null, 'admin', admin);
    const result = setScopedDashboardConfig(withAdmin, 'client', client);

    expect(getScopedDashboardConfig(result, 'admin')).toEqual(admin);
    expect(getScopedDashboardConfig(result, 'client')).toEqual(client);
  });

  it('читает прежний формат массива', () => {
    const legacyConfig = [{ id: 'client', type: 'pendingSurveys' }];

    expect(getScopedDashboardConfig(legacyConfig, 'client')).toEqual(legacyConfig);
  });
});
