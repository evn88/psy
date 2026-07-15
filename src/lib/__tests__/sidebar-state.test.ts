import { describe, expect, it } from 'vitest';

import { getDefaultSidebarOpen } from '@/lib/sidebar-state';

describe('getDefaultSidebarOpen', () => {
  it('раскрывает меню при первом посещении', () => {
    expect(getDefaultSidebarOpen(undefined)).toBe(true);
  });

  it('сохраняет свёрнутое состояние', () => {
    expect(getDefaultSidebarOpen('false')).toBe(false);
  });

  it('сохраняет раскрытое состояние', () => {
    expect(getDefaultSidebarOpen('true')).toBe(true);
  });
});
