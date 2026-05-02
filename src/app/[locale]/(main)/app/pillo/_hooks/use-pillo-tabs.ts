'use client';

import { useState } from 'react';
import type { PilloTab } from '../_components/types';

/**
 * Хук для управления активной вкладкой в приложении Pillo.
 * @param initialTab - начальная активная вкладка.
 * @returns Состояние активной вкладки и функция для её изменения.
 */
export const usePilloTabs = (initialTab: PilloTab = 'home') => {
  const [activeTab, setActiveTab] = useState<PilloTab>(initialTab);

  return {
    activeTab,
    setActiveTab
  };
};
