import type { PilloMedicationView } from './types';

/**
 * Возвращает CSS-класс цветной полоски остатка.
 * @param status - статус остатка таблетки.
 * @returns Tailwind-классы градиента.
 */
export const getStockGradientClass = (status: PilloMedicationView['stockStatus']): string => {
  if (status === 'empty') {
    return 'from-red-500 via-rose-500 to-orange-400';
  }

  if (status === 'low') {
    return 'from-amber-400 via-yellow-400 to-orange-300';
  }

  return 'from-emerald-400 via-lime-400 to-teal-300';
};
