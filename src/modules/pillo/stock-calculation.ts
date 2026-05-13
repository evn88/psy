export type PilloStockStatus = 'enough' | 'low' | 'empty';

export type PilloAmountInput = number | string | { toString: () => string } | null | undefined;

type PilloConsumptionRule = {
  doseUnits: PilloAmountInput;
  daysOfWeek: readonly unknown[];
  isActive?: boolean;
};

export type PilloStockOutlook = {
  daysLeft: number | null;
  buyAtDate: string | null;
  stockEndsAt: string | null;
};

const PILLO_AMOUNT_SCALE = 4;
const PILLO_AMOUNT_MULTIPLIER = 10 ** PILLO_AMOUNT_SCALE;
const PILLO_AMOUNT_MIN_UNIT = 1 / PILLO_AMOUNT_MULTIPLIER;

/**
 * Округляет складские значения Pillo до единого scale, чтобы дробные дозы не копили хвосты.
 * @param value - исходное значение.
 * @returns Значение с точностью, совместимой с Prisma Decimal.
 */
export const roundPilloAmount = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const rounded =
    Math.round((value + Number.EPSILON) * PILLO_AMOUNT_MULTIPLIER) / PILLO_AMOUNT_MULTIPLIER;

  return Math.abs(rounded) <= PILLO_AMOUNT_MIN_UNIT ? 0 : rounded;
};

/**
 * Приводит число или Decimal-подобное значение к обычному числу.
 * @param value - исходное значение остатка или дозы.
 * @returns Числовое значение для UI и расчётов.
 */
export const toNumber = (value: PilloAmountInput): number => {
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
 * Возвращает числовое значение для расчётов, включая дробные строки.
 * @param value - исходное значение дозы или остатка.
 * @returns Нормализованное число.
 */
const toCalculationNumber = (value: PilloAmountInput): number => {
  return parsePilloAmount(value) ?? toNumber(value);
};

/**
 * Парсит дозу Pillo из числа, decimal-строки или простой дроби вида `1/2`.
 * @param value - значение из формы или БД.
 * @returns Нормализованное число либо `null`, если значение некорректно.
 */
export const parsePilloAmount = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? roundPilloAmount(value) : null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value !== 'string' &&
    typeof (value as { toString?: unknown }).toString !== 'function'
  ) {
    return null;
  }

  const rawValue = value.toString().trim().replace(',', '.');

  if (!rawValue) {
    return null;
  }

  const fractionMatch = rawValue.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);

  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);

    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }

    return roundPilloAmount(numerator / denominator);
  }

  const parsed = Number(rawValue);

  return Number.isFinite(parsed) ? roundPilloAmount(parsed) : null;
};

/**
 * Форматирует складское значение Pillo без лишних нулей после запятой.
 * @param value - исходное значение.
 * @returns Читаемое значение для интерфейса и уведомлений.
 */
export const formatPilloAmount = (value: PilloAmountInput): string => {
  return roundPilloAmount(toCalculationNumber(value))
    .toFixed(PILLO_AMOUNT_SCALE)
    .replace(/\.?0+$/, '');
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
}): number => {
  if (typeof params.stockUnits === 'number') {
    return Math.max(0, roundPilloAmount(params.stockUnits));
  }

  if (params.unitsPerPackage && params.unitsPerPackage > 0) {
    return roundPilloAmount(params.packagesCount * params.unitsPerPackage);
  }

  return 0;
};

/**
 * Уменьшает остаток на дозу и не допускает отрицательных значений.
 * @param params - текущий остаток и принятая доза.
 * @returns Следующий остаток.
 */
export const subtractPilloDoseFromStock = (params: {
  stockUnits: PilloAmountInput;
  doseUnits: PilloAmountInput;
}): number => {
  return Math.max(
    0,
    roundPilloAmount(toCalculationNumber(params.stockUnits) - toCalculationNumber(params.doseUnits))
  );
};

/**
 * Возвращает дозу обратно в остаток после отмены приёма.
 * @param params - текущий остаток и отменённая доза.
 * @returns Следующий остаток.
 */
export const restorePilloDoseToStock = (params: {
  stockUnits: PilloAmountInput;
  doseUnits: PilloAmountInput;
}): number => {
  return Math.max(
    0,
    roundPilloAmount(toCalculationNumber(params.stockUnits) + toCalculationNumber(params.doseUnits))
  );
};

/**
 * Возвращает статус остатка таблетки.
 * @param params - остаток, минимальный порог и ближайшая доза.
 * @returns Статус для списка таблеток и предупреждений.
 */
export const getPilloStockStatus = (params: {
  stockUnits: PilloAmountInput;
  minThresholdUnits: PilloAmountInput;
  nextDoseUnits?: PilloAmountInput;
}): PilloStockStatus => {
  const stockUnits = toCalculationNumber(params.stockUnits);
  const minThresholdUnits = toCalculationNumber(params.minThresholdUnits);
  const nextDoseUnits = toCalculationNumber(params.nextDoseUnits);

  if (stockUnits <= 2) {
    return 'empty';
  }

  if (stockUnits <= minThresholdUnits || (nextDoseUnits > 0 && stockUnits <= nextDoseUnits * 2)) {
    return 'low';
  }

  return 'enough';
};

/**
 * Рассчитывает прогноз окончания запаса по активным правилам расписания.
 * @param params - остаток, правила, текущая дата и запасной порог покупки.
 * @returns Даты окончания и рекомендации покупки.
 */
export const calculatePilloStockOutlook = (params: {
  stockUnits: PilloAmountInput;
  rules: PilloConsumptionRule[];
  referenceDate: Date;
  lowStockWarningDays: number;
}): PilloStockOutlook => {
  const weeklyConsumption = params.rules.reduce((total, rule) => {
    if (rule.isActive === false) {
      return total;
    }

    return total + toCalculationNumber(rule.doseUnits) * rule.daysOfWeek.length;
  }, 0);

  if (weeklyConsumption <= 0) {
    return {
      daysLeft: null,
      buyAtDate: null,
      stockEndsAt: null
    };
  }

  const dailyConsumption = weeklyConsumption / 7;
  const daysLeft = Math.floor(toCalculationNumber(params.stockUnits) / dailyConsumption);
  const endsDate = new Date(params.referenceDate);
  endsDate.setDate(endsDate.getDate() + daysLeft);

  const daysToBuy = Math.max(0, daysLeft - params.lowStockWarningDays);
  const buyAtDate = daysToBuy > 1 ? new Date(params.referenceDate) : null;

  if (buyAtDate) {
    buyAtDate.setDate(buyAtDate.getDate() + daysToBuy);
  }

  return {
    daysLeft,
    buyAtDate: buyAtDate?.toISOString() ?? null,
    stockEndsAt: endsDate.toISOString()
  };
};
