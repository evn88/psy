import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPilloStockStatus, resolveStockUnits } from '../stock';

describe('Pillo stock helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('считает остаток через упаковки, если указано количество в упаковке', () => {
    // Arrange
    const input = { packagesCount: 3, unitsPerPackage: 20, stockUnits: 4 };

    // Act
    const result = resolveStockUnits(input);

    // Assert
    expect(result).toBe(60);
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
});
