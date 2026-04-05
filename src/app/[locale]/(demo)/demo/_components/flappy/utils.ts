import { BIRD_X_PIXELS, FIELD_HEIGHT, VIEWPORT_WIDTH } from './constants';
import type { PipeData } from './types';

// Генерация параметров трубы относительно осей графика
export const generatePipeData = (
  xAxisValue: number,
  gapSize = 35,
  minPipeHeight = 10
): Omit<PipeData, 'zero'> => {
  const fieldHeight = FIELD_HEIGHT; // 0..100
  // Оставляем место для труб
  const safeMin = minPipeHeight + gapSize / 2;
  const safeMax = fieldHeight - minPipeHeight - gapSize / 2;
  const gapCenter = Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;

  return {
    x: xAxisValue,
    bottomY: gapCenter - gapSize / 2,
    topY: fieldHeight,
    topOpen: gapCenter + gapSize / 2
  };
};

// Проверка коллизии птицы с трубами и границами
export const checkCollision = (
  birdYPixels: number,
  pipesData: PipeData[],
  currentXAxisMin: number,
  parentHeightPixels: number,
  plotWidthPixels: number,
  debug = false
) => {
  // 1. Пол и потолок (в пикселях контейнера)
  if (birdYPixels > parentHeightPixels || birdYPixels < 0) return true;

  // 2. Трубы — позиция птицы по X в координатах оси
  const birdPixelX = BIRD_X_PIXELS;
  const currentBirdAxisX = currentXAxisMin + (birdPixelX / plotWidthPixels) * VIEWPORT_WIDTH;

  // Хитбокс по X — небольшой допуск
  const collisionMargin = 20;

  if (debug) {
    console.log('Collision check:', {
      birdPixelX,
      plotWidthPixels,
      currentXAxisMin,
      currentBirdAxisX,
      collisionMargin,
      nearestPipe: pipesData[0]
    });
  }

  const collidingPipe = pipesData.find(pipe => {
    const distance = Math.abs(pipe.x - currentBirdAxisX);
    if (debug && distance < 100) {
      console.log('Pipe distance:', {
        pipeX: pipe.x,
        birdX: currentBirdAxisX,
        distance,
        collisionMargin
      });
    }
    return distance < collisionMargin;
  });

  if (collidingPipe) {
    // Конвертация Y птицы в значение оси (0 внизу, 100 вверху для ValueAxis)
    const birdYPercent = birdYPixels / parentHeightPixels;
    const birdYValue = 100 - birdYPercent * 100;

    const gapBottom = collidingPipe.bottomY;
    const gapTop = collidingPipe.topOpen;

    if (debug) {
      console.log('Y collision check:', {
        birdYPixels,
        birdYValue,
        gapBottom,
        gapTop
      });
    }

    // Небольшой допуск по Y
    if (birdYValue < gapBottom + 5 || birdYValue > gapTop - 5) {
      return true;
    }
  }
  return false;
};
