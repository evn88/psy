export type PilloStockStatus = 'enough' | 'low' | 'empty';

/**
 * Приводит число или Decimal-подобное значение к обычному числу.
 * @param value - исходное значение остатка или дозы.
 * @returns Числовое значение для UI и расчётов.
 */
export const toNumber = (
  value: number | string | { toString: () => string } | null | undefined
) => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Вычисляет фактический остаток при создании таблетки.
 * Если указано количество единиц в упаковке, остаток считается через упаковки.
 * @param params - количество упаковок, единиц в упаковке и ручной остаток.
 * @returns Итоговый остаток в единицах приёма.
 */
export const resolveStockUnits = (params: {
  packagesCount: number;
  unitsPerPackage?: number | null;
  stockUnits?: number | null;
}) => {
  if (params.unitsPerPackage && params.unitsPerPackage > 0) {
    return params.packagesCount * params.unitsPerPackage;
  }

  return Math.max(0, params.stockUnits ?? 0);
};

/**
 * Возвращает статус остатка таблетки.
 * @param params - остаток, минимальный порог и ближайшая доза.
 * @returns Статус для списка таблеток и предупреждений.
 */
export const getPilloStockStatus = (params: {
  stockUnits: number | string | { toString: () => string };
  minThresholdUnits: number | string | { toString: () => string };
  nextDoseUnits?: number | string | { toString: () => string } | null;
}): PilloStockStatus => {
  const stockUnits = toNumber(params.stockUnits);
  const minThresholdUnits = toNumber(params.minThresholdUnits);
  const nextDoseUnits = toNumber(params.nextDoseUnits);

  if (stockUnits <= 0) {
    return 'empty';
  }

  if (stockUnits <= minThresholdUnits || (nextDoseUnits > 0 && stockUnits <= nextDoseUnits * 2)) {
    return 'low';
  }

  return 'enough';
};
