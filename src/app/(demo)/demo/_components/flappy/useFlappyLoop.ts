import {useEffect} from 'react';
import type * as am5 from '@amcharts/amcharts5';
import type * as am5xy from '@amcharts/amcharts5/xy';
import {VIEWPORT_WIDTH} from './constants';
import {checkCollision, generatePipeData} from './utils';
import type {PipeData} from './types';

type MutableRef<T> = { current: T | null } | { current: T };

export interface GameState {
    birdY: number;
    birdVelocity: number;
    pipes: PipeData[];
    axisXOffset: number;
    lastPipeX: number;
}

export interface GameRefs {
    rootRef: MutableRef<am5.Root>;
    xAxisRef: MutableRef<am5xy.ValueAxis<am5xy.AxisRenderer>>;
    birdSpriteRef: MutableRef<am5.Container>;
    bottomSeriesRef: MutableRef<am5xy.ColumnSeries>;
    topSeriesRef: MutableRef<am5xy.ColumnSeries>;
    gameStateRef: MutableRef<GameState>;
}

interface UseFlappyLoopParams {
    isGameRunning: boolean;
    isGameOver: boolean;
    containerHeight: number;
    containerWidth: number;
    showDebug: boolean;
    score: number;
    setScore: (s: number) => void;
    speed: number;
    gravity: number;
    refs: GameRefs;
    onGameOver: () => void;
}

/**
 * Хук игрового цикла: физика, прокрутка мира, генерация труб, коллизии и счет.
 * Вся логика вынесена из компонента для упрощения чтения и переиспользования.
 */
export default function useFlappyLoop({
                                          isGameRunning,
                                          isGameOver,
                                          containerHeight,
                                          containerWidth,
                                          showDebug,
                                          score,
                                          setScore,
                                          speed,
                                          gravity,
                                          refs,
                                          onGameOver,
                                      }: UseFlappyLoopParams) {
    useEffect(() => {
        if (!isGameRunning || isGameOver) return;
        let animationFrameId: number;

        const loop = () => {
            const state = refs.gameStateRef.current as GameState;
            const root = refs.rootRef.current as am5.Root | null;

            if (!root || !refs.xAxisRef.current || !(refs.birdSpriteRef).current) {
                animationFrameId = requestAnimationFrame(loop);
                return;
            }

            // Физика
            state.birdVelocity += gravity;
            state.birdY += state.birdVelocity;
            refs.birdSpriteRef.current.set('y', state.birdY);
            refs.birdSpriteRef.current.set(
                'rotation',
                Math.min(Math.max(state.birdVelocity * 3, -30), 90)
            );

            // Мир
            state.axisXOffset += speed;
            const viewportWidth = VIEWPORT_WIDTH;
            refs.xAxisRef.current.set('min', state.axisXOffset);
            refs.xAxisRef.current.set('max', state.axisXOffset + viewportWidth);

            // Генерация
            if (state.axisXOffset + viewportWidth > state.lastPipeX + 400) {
                const newPipeX = state.lastPipeX + 400;
                const pipeData = generatePipeData(newPipeX);
                const dataItem = {...pipeData, zero: 0};
                state.pipes.push(dataItem);
                state.lastPipeX = newPipeX;

                const cleanPipes = state.pipes.filter((p) => p.x > state.axisXOffset - 200);
                state.pipes = cleanPipes;

                if (refs.bottomSeriesRef.current)
                    refs.bottomSeriesRef.current.data.setAll(cleanPipes);
                if (refs.topSeriesRef.current)
                    refs.topSeriesRef.current.data.setAll(cleanPipes);
            }

            // Коллизии
            if (
                checkCollision(
                    state.birdY,
                    state.pipes,
                    state.axisXOffset,
                    containerHeight,
                    containerWidth,
                    showDebug
                )
            ) {
                onGameOver();
                return;
            }

            // Счет
            const currentScore = Math.max(0, Math.floor((state.axisXOffset - 400) / 400));
            if (currentScore > score) setScore(currentScore);

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [
        isGameRunning,
        isGameOver,
        containerHeight,
        containerWidth,
        showDebug,
        score,
        setScore,
        speed,
        gravity,
        onGameOver,
    ]);
}
