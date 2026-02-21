'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import type { FC } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Компонент с кнопками навигации для профиля пользователя
 * @returns {JSX.Element} Кнопки "Назад" и "На главную"
 */
export const ProfileNavButtons = () => {
  const router = useRouter();
  const t = useTranslations('Profile');

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
        {t('goBack')}
      </Button>
      <Button variant="outline" onClick={handleHome}>
        <Home className="w-4 h-4 mr-2" />
        {t('goToHome')}
      </Button>
    </div>
  );
};
