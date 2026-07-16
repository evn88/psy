import { describe, expect, it } from 'vitest';

import { detectBrowserTimeZone, normalizeBrowserTimeZone } from '@/lib/browser-timezone';
import { isValidTimeZone } from '@/lib/timezone';

describe('detectBrowserTimeZone', () => {
  it('возвращает валидный часовой пояс браузера', () => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const expectedTimezone = isValidTimeZone(browserTimezone) ? browserTimezone : null;

    expect(detectBrowserTimeZone()).toBe(expectedTimezone);
  });

  it('отклоняет отсутствующий или некорректный часовой пояс', () => {
    expect(normalizeBrowserTimeZone(undefined)).toBeNull();
    expect(normalizeBrowserTimeZone('Invalid/Timezone')).toBeNull();
  });
});
