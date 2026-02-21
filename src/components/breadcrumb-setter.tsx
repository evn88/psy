'use client';

import { useEffect } from 'react';
import { useBreadcrumbContext } from '@/components/breadcrumb-context';

interface BreadcrumbSetterProps {
  /** Сегмент URL (например, ID опроса) */
  segment: string;
  /** Отображаемое название (например, заголовок опроса) */
  title: string;
}

/**
 * Клиентский компонент для установки динамического названия breadcrumb.
 * Не рендерит ничего визуально — только обновляет контекст.
 */
export const BreadcrumbSetter = ({ segment, title }: BreadcrumbSetterProps) => {
  const { setSegmentName } = useBreadcrumbContext();

  useEffect(() => {
    setSegmentName(segment, title);
  }, [segment, title, setSegmentName]);

  return null;
};
