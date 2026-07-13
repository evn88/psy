'use client';

import { useState, useEffect } from 'react';
import { Tabs } from '@/components/ui/tabs';

export function SurveysTabs({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('surveys-active-tab');
      if (saved === 'intakes' || saved === 'tests') {
        return saved;
      }
    }
    return 'intakes';
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const handleTabChange = (value: string) => {
    setTab(value);
    localStorage.setItem('surveys-active-tab', value);
  };

  // Пока компонент не смонтирован на клиенте, рендерим стандартный Tabs с дефолтным значением,
  // чтобы избежать ошибки гидратации (hydration mismatch)
  if (!mounted) {
    return (
      <Tabs defaultValue="intakes" className="space-y-8">
        {children}
      </Tabs>
    );
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="space-y-8">
      {children}
    </Tabs>
  );
}
