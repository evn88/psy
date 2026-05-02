'use client';

import { useState } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type ScreenSize = 'mobile' | 'tablet' | 'desktop';

interface PreviewSizeSwitcherProps {
  children: React.ReactNode;
  className?: string;
}

const sizes: Record<
  ScreenSize,
  { labelKey: 'mobile' | 'tablet' | 'desktop'; icon: typeof Monitor; width: string }
> = {
  mobile: { labelKey: 'mobile', icon: Smartphone, width: '375px' },
  tablet: { labelKey: 'tablet', icon: Tablet, width: '768px' },
  desktop: { labelKey: 'desktop', icon: Monitor, width: '100%' }
};

export function PreviewSizeSwitcher({ children, className }: PreviewSizeSwitcherProps) {
  const tPreviewSwitcher = useTranslations('Admin.blog.editor.previewSwitcher');
  const [current, setCurrent] = useState<ScreenSize>('desktop');

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Переключатель */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {(Object.entries(sizes) as [ScreenSize, (typeof sizes)[ScreenSize]][]).map(
          ([key, { labelKey, icon: Icon }]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCurrent(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                current === key
                  ? 'bg-white shadow-sm text-[#03070A]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title={tPreviewSwitcher(labelKey)}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{tPreviewSwitcher(labelKey)}</span>
            </button>
          )
        )}
      </div>

      {/* Контейнер предпросмотра */}
      <div className="overflow-x-auto border rounded-lg bg-white">
        <div
          className="mx-auto transition-all duration-300"
          style={{ width: sizes[current].width, minHeight: '200px' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
