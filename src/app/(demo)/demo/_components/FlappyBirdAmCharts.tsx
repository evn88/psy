'use client';

import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import type * as am5 from '@amcharts/amcharts5';
import type * as am5xy from '@amcharts/amcharts5/xy';
import birdSvg from '@/assets/images/bird.svg';
import {DEFAULT_GAME_SPEED, DEFAULT_GRAVITY, JUMP_STRENGTH, VIEWPORT_WIDTH} from './flappy/constants';
import {
    createAxes,
    createBird,
    createChart,
    createDebugBirdXLine,
    createPipesSeries,
    createRoot
} from './flappy/amchartsSetup';
import type {PipeData} from './flappy/types';
import FlappySettings from './flappy/FlappySettings';
import useFlappyLoop from './flappy/useFlappyLoop';

// ==============================================
// 2–3. КОНФИГУРАЦИЯ И ЛОГИКА — вынесены в модули ./flappy
// ==============================================

// ==============================================
// 4. КОМПОНЕНТ
// ==============================================

interface FlappyBirdAmChartsProps {
    containerHeight?: number;
    containerWidth?: number;
    showDebug?: boolean; // Параметр для отображения границ коллизий
    showSettings?: boolean; // Показывать настройки скорости и гравитации
}

export default function FlappyBirdAmCharts({
                                               containerHeight = 200,
                                               containerWidth = 200,
                                               showDebug = false,
                                               showSettings = false
                                           }: FlappyBirdAmChartsProps) {
    const [score, setScore] = useState(0);
    const [isGameRunning, setIsGameRunning] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);

    const [gameSpeed, setGameSpeed] = useState(DEFAULT_GAME_SPEED);
    const [gravity, setGravity] = useState(DEFAULT_GRAVITY);

    const rootRef = useRef<am5.Root | null>(null);
    const chartRef = useRef<am5xy.XYChart | null>(null);
    const birdSpriteRef = useRef<am5.Container | null>(null);
    const xAxisRef = useRef<am5xy.ValueAxis<am5xy.AxisRenderer> | null>(null);
    const bottomSeriesRef = useRef<am5xy.ColumnSeries | null>(null);
    const topSeriesRef = useRef<am5xy.ColumnSeries | null>(null);

    // Контейнер для графика через ref вместо document.getElementById
    const chartDivRef = useRef<HTMLDivElement | null>(null);

    const gameStateRef = useRef<{
        birdY: number;
        birdVelocity: number;
        pipes: PipeData[];
        axisXOffset: number;
        lastPipeX: number;
    }>({
        birdY: 250,
        birdVelocity: 0,
        pipes: [],
        axisXOffset: 0,
        lastPipeX: 0
    });

    const settingsRef = useRef({speed: DEFAULT_GAME_SPEED, gravity: DEFAULT_GRAVITY});
    useEffect(() => {
        settingsRef.current = {speed: Number(gameSpeed), gravity: Number(gravity)};
    }, [gameSpeed, gravity]);

    // --- График ---
    useLayoutEffect(() => {
        if (rootRef.current) {
            rootRef.current.dispose();
            rootRef.current = null;
        }

        const containerEl = chartDivRef.current;
        if (!containerEl) return;

        const root = createRoot(containerEl, containerWidth, containerHeight);
        rootRef.current = root;

        const chart = createChart(root, containerWidth, containerHeight);
        chartRef.current = chart;

        const {xAxis, yAxis} = createAxes(root, chart);
        xAxisRef.current = xAxis;

        const {bottomSeries, topSeries} = createPipesSeries(root, chart, xAxis, yAxis);
        bottomSeriesRef.current = bottomSeries;
        topSeriesRef.current = topSeries;

        // Птица
        birdSpriteRef.current = createBird(root, chart, birdSvg.src, containerHeight, showDebug);

        // Debug: вертикальная линия показывающая позицию птицы на оси X
        if (showDebug) {
            createDebugBirdXLine(root, chart, containerHeight);
        }

        return () => {
            if (rootRef.current) {
                rootRef.current.dispose();
                rootRef.current = null;
            }
        };
    }, []);

    // --- Цикл --- вынесен в кастомный хук

    // --- UI ---
    const startGame = useCallback(() => {
        if (!rootRef.current || !chartRef.current) return;
        // Используем фиксированную высоту контейнера
        gameStateRef.current = {birdY: containerHeight / 2, birdVelocity: 0, pipes: [], axisXOffset: 0, lastPipeX: 400};
        setScore(0);
        setIsGameRunning(true);
        setIsGameOver(false);
        if (bottomSeriesRef.current) bottomSeriesRef.current.data.clear();
        if (topSeriesRef.current) topSeriesRef.current.data.clear();
        if (xAxisRef.current) {
            xAxisRef.current.set("min", 0);
            xAxisRef.current.set("max", VIEWPORT_WIDTH);
        }
        jump();
    }, [containerHeight]);
    const jump = () => {
        gameStateRef.current.birdVelocity = -JUMP_STRENGTH;
    };
    const gameOver = useCallback(() => {
        setIsGameOver(true);
        setIsGameRunning(false);
    }, []);

    // Инициализация игрового цикла через хук
    useFlappyLoop({
        isGameRunning,
        isGameOver,
        containerHeight,
        containerWidth,
        showDebug,
        score,
        setScore,
        refs: {
            rootRef,
            xAxisRef,
            birdSpriteRef,
            bottomSeriesRef,
            topSeriesRef,
            gameStateRef,
            settingsRef,
        },
        onGameOver: gameOver,
    });

    useEffect(() => {
        const handleSpaceKey = (e: KeyboardEvent) => {
            if (e.code === 'KeyJ') {
                e.preventDefault();
                if (!isGameRunning && !isGameOver) startGame();
                else if (isGameOver) startGame();
                else jump();
            }
        };
        window.addEventListener("keydown", handleSpaceKey);
        return () => window.removeEventListener("keydown", handleSpaceKey);
    }, [isGameRunning, isGameOver, startGame]);


    return (
        <div style={{
            all: 'initial',
            display: 'block',
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: '16px',
            lineHeight: '1.5',
            color: '#000'
        }}>
            <div style={{
                width: `${containerWidth}px`,
                margin: '0 auto',
                fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}>
                <div
                    style={{
                        position: 'relative',
                        width: `${containerWidth}px`,
                        height: `${containerHeight}px`,
                        backgroundColor: '#e0f2fe',
                        border: '4px solid #0369a1',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}
                >
                    <div ref={chartDivRef} style={{width: `${containerWidth}px`, height: `${containerHeight}px`}}></div>
                    <div style={{
                        position: 'absolute',
                        top: '16px',
                        left: '16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        padding: '8px 16px',
                        borderRadius: '9999px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        zIndex: 10
                    }}>
                        <span style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#1f2937'
                        }}>{score}</span>
                    </div>
                    {(!isGameRunning || isGameOver) && (
                        <div style={{
                            position: 'absolute',
                            inset: '0',
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 20,
                            backdropFilter: 'blur(4px)'
                        }}>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '32px',
                                borderRadius: '16px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                textAlign: 'center',
                                maxWidth: '384px',
                                width: '100%',
                                margin: '0 16px'
                            }}>
                                {isGameOver ? (
                                    <>
                                        <h2 style={{
                                            fontSize: '36px',
                                            fontWeight: '900',
                                            color: '#ef4444',
                                            marginBottom: '8px'
                                        }}>GAME OVER</h2>
                                        <p style={{
                                            fontSize: '20px',
                                            color: '#4b5563',
                                            marginBottom: '16px'
                                        }}>Счет: {score}</p>
                                        <button
                                            onClick={startGame}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                backgroundColor: '#ef4444',
                                                color: 'white',
                                                borderRadius: '8px',
                                                fontWeight: 'bold',
                                                fontSize: '18px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                                        >ЗАНОВО (J)
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h2 style={{
                                            fontSize: '36px',
                                            fontWeight: '900',
                                            color: '#0284c7',
                                            marginBottom: '8px'
                                        }}>FLAPPY CHART</h2>
                                        <button
                                            onClick={startGame}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                backgroundColor: '#0ea5e9',
                                                color: 'white',
                                                borderRadius: '8px',
                                                fontWeight: 'bold',
                                                fontSize: '18px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                                transition: 'background-color 0.2s',
                                                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0ea5e9'}
                                        >СТАРТ (J)
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {showSettings && (
                    <FlappySettings
                        containerWidth={containerWidth}
                        gameSpeed={gameSpeed}
                        gravity={gravity}
                        onChangeGameSpeed={setGameSpeed}
                        onChangeGravity={setGravity}
                        isGameRunning={isGameRunning}
                    />
                )}
            </div>
        </div>
    );
}