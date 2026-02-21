'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import type { FC } from 'react';

/**
 * Компонент с кнопками навигации для профиля пользователя
 * @returns {JSX.Element} Кнопки "Назад" и "На главную"
 */
export const ProfileNavButtons: FC = () => {
  const router = useRouter();

  /**
   * Обработчик возврата на предыдущую страницу
   */
  const handleBack = (): void => {
    router.back();
  };

  /**
   * Обработчик перехода на главную страницу
   */
  const handleHome = (): void => {
    router.push('/');
  };

  return (
    <div className="flex gap-2 items-center">
      <Button variant="outline" onClick={handleBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      <Button variant="outline" onClick={handleHome}>
        <Home className="w-4 h-4 mr-2" />
        Home
      </Button>
    </div>
  );
};
