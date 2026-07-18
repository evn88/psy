import { describe, expect, it } from 'vitest';

import { formatUtcOffset } from '@/lib/timezone';

describe('formatUtcOffset', () => {
  it('учитывает переход на летнее время для даты события', () => {
    expect(formatUtcOffset('Europe/Belgrade', new Date('2026-01-15T12:00:00.000Z'))).toBe('UTC+1');
    expect(formatUtcOffset('Europe/Belgrade', new Date('2026-07-15T12:00:00.000Z'))).toBe('UTC+2');
  });

  it('использует UTC для отсутствующего или некорректного часового пояса', () => {
    expect(formatUtcOffset(null)).toBe('UTC+0');
    expect(formatUtcOffset('Unknown/Timezone')).toBe('UTC+0');
  });
});
