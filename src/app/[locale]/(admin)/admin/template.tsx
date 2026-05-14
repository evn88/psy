import { type ReactNode } from 'react';

interface AdminTemplateProps {
  children: ReactNode;
}

/**
 * Добавляет единый плавный переход между страницами админ-панели.
 * Template ремонтируется при смене дочернего маршрута, поэтому анимация повторяется на навигации.
 */
const AdminTemplate = ({ children }: Readonly<AdminTemplateProps>) => {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-reduce:animate-none">
      {children}
    </div>
  );
};

export default AdminTemplate;
