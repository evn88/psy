import { type ReactNode } from 'react';

interface MyTemplateProps {
  children: ReactNode;
}

/**
 * Добавляет единый плавный переход между страницами личного кабинета.
 * Template ремонтируется при смене дочернего маршрута, поэтому анимация повторяется на навигации.
 */
const MyTemplate = ({ children }: Readonly<MyTemplateProps>) => {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-reduce:animate-none">
      {children}
    </div>
  );
};

export default MyTemplate;
