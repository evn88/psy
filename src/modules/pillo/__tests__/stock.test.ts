import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calculatePilloStockOutlook,
  formatPilloAmount,
  getPilloStockStatus,
  parsePilloAmount,
  resolveStockUnits,
  restorePilloDoseToStock,
  subtractPilloDoseFromStock
} from '../stock';

describe('Pillo stock helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('считает остаток через упаковки, если не указан явный остаток', () => {
    // Arrange
    const input = { packagesCount: 3, unitsPerPackage: 20 };

    // Act
    const result = resolveStockUnits(input);

    // Assert
    expect(result).toBe(60);
  });

  it('использует явно указанный остаток, если он передан', () => {
    // Arrange
    const input = { packagesCount: 3, unitsPerPackage: 20, stockUnits: 45 };

    // Act
    const result = resolveStockUnits(input);

    // Assert
    expect(result).toBe(45);
  });

  it('возвращает красный статус для нулевого остатка', () => {
    // Arrange
    const stockUnits = 0;

    // Act
    const status = getPilloStockStatus({ stockUnits, minThresholdUnits: 5 });

    // Assert
    expect(status).toBe('empty');
  });

  it('возвращает жёлтый статус при достижении порога или последних двух дозах', () => {
    // Arrange
    const stockUnits = 4;

    // Act
    const status = getPilloStockStatus({
      stockUnits,
      minThresholdUnits: 2,
      nextDoseUnits: 2
    });

    // Assert
    expect(status).toBe('low');
  });

  it('парсит простые дроби для дозировки', () => {
    // Arrange
    const dose = '1/3';

    // Act
    const result = parsePilloAmount(dose);

    // Assert
    expect(result).toBe(0.3333);
  });

  it('форматирует дробные значения без лишних нулей', () => {
    // Arrange
    const dose = '1/2';

    // Act
    const result = formatPilloAmount(dose);

    // Assert
    expect(result).toBe('0.5');
  });

  it('уменьшает остаток с учётом дробной дозы', () => {
    // Arrange
    const input = { stockUnits: 2, doseUnits: '1/4' };

    // Act
    const result = subtractPilloDoseFromStock(input);

    // Assert
    expect(result).toBe(1.75);
  });

  it('не оставляет технический хвост после трёх доз по одной трети', () => {
    // Arrange
    const firstStock = subtractPilloDoseFromStock({ stockUnits: 1, doseUnits: '1/3' });
    const secondStock = subtractPilloDoseFromStock({ stockUnits: firstStock, doseUnits: '1/3' });

    // Act
    const result = subtractPilloDoseFromStock({ stockUnits: secondStock, doseUnits: '1/3' });

    // Assert
    expect(result).toBe(0);
  });

  it('возвращает дробную дозу в остаток при отмене приёма', () => {
    // Arrange
    const input = { stockUnits: 1.25, doseUnits: '1/2' };

    // Act
    const result = restorePilloDoseToStock(input);

    // Assert
    expect(result).toBe(1.75);
  });

  it('считает прогноз остатка через общий расчёт потребления', () => {
    // Arrange
    const referenceDate = new Date('2026-05-13T10:00:00.000Z');

    // Act
    const result = calculatePilloStockOutlook({
      stockUnits: 2,
      rules: [{ doseUnits: '1/2', daysOfWeek: [1, 2, 3, 4] }],
      referenceDate,
      lowStockWarningDays: 2
    });

    // Assert
    expect(result.daysLeft).toBe(7);
    expect(result.buyAtDate).toBe('2026-05-18T10:00:00.000Z');
    expect(result.stockEndsAt).toBe('2026-05-20T10:00:00.000Z');
  });
});
