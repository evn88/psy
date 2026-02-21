'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface BreadcrumbContextValue {
  /** Динамические сегменты пути → отображаемые названия */
  dynamicSegments: Record<string, string>;
  /** Устанавливает отображаемое название для конкретного сегмента URL */
  setSegmentName: (segment: string, name: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  dynamicSegments: {},
  setSegmentName: () => {}
});

/**
 * Провайдер контекста для динамических breadcrumbs.
 * Позволяет дочерним компонентам задавать пользовательские названия для сегментов URL.
 */
export const BreadcrumbProvider = ({ children }: { children: ReactNode }) => {
  const [dynamicSegments, setDynamicSegments] = useState<Record<string, string>>({});

  const setSegmentName = useCallback((segment: string, name: string) => {
    setDynamicSegments(prev => {
      if (prev[segment] === name) return prev;
      return { ...prev, [segment]: name };
    });
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ dynamicSegments, setSegmentName }}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

/**
 * Хук для доступа к динамическим сегментам breadcrumbs.
 */
export const useBreadcrumbContext = () => useContext(BreadcrumbContext);

/**
 * Хук для установки динамического названия сегмента breadcrumb.
 * Вызывается из страниц с динамическими маршрутами.
 */
export const useBreadcrumbSegment = (segment: string, name: string) => {
  const { setSegmentName } = useBreadcrumbContext();
  // Используем эффект чтобы вызвать только на клиенте
  if (typeof window !== 'undefined') {
    setSegmentName(segment, name);
  }
};
