'use client';

import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import birdSvg from '@/assets/images/bird.svg';

// ==============================================
// 2. КОНФИГУРАЦИЯ
// ==============================================

const PIPE_COLOR = "#73C6B6";
const PIPE_STROKE = "#16A085";
const PIPE_WIDTH = 60; // Визуальная ширина трубы в пикселях

const DEFAULT_GAME_SPEED = 6;
const DEFAULT_GRAVITY = 0.5;
const JUMP_STRENGTH = 8;

interface PipeData {
    x: number;
    bottomY: number;
    topY: number;
    topOpen: number;
    zero?: number;
}

// ==============================================
// 3. ЛОГИКА ИГРЫ
// ==============================================

const generatePipeData = (xAxisValue: number, gapSize = 35, minPipeHeight = 10) => {
    const fieldHeight = 100;
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

const checkCollision = (birdY: number, pipesData: PipeData[], currentXAxisMin: number, parentHeight: number, plotWidth: number, debug = false) => {
    // 1. Пол и потолок
    if (birdY > parentHeight || birdY < 0) return true;

    // 2. Трубы
    // Птица находится на 100 пикселях, конвертируем в значение оси X
    // Ось X: 0-1000, viewport width: 1000
    const birdPixelX = 100;
    const viewportWidth = 1000;
    const currentBirdAxisX = currentXAxisMin + (birdPixelX / plotWidth) * viewportWidth;

    // Хитбокс: уменьшенный для более точной коллизии (птица ~15px ширина)
    const collisionMargin = 20;

    if (debug) {
        console.log('Collision check:', {
            birdPixelX,
            plotWidth,
            currentXAxisMin,
            currentBirdAxisX,
            collisionMargin,
            nearestPipe: pipesData[0]
        });
    }

    const collidingPipe = pipesData.find(pipe => {
        // Проверяем, находится ли центр трубы достаточно близко к центру птицы по оси X
        const distance = Math.abs(pipe.x - currentBirdAxisX);
        if (debug && distance < 100) {
            console.log('Pipe distance:', {pipeX: pipe.x, birdX: currentBirdAxisX, distance, collisionMargin});
        }
        return distance < collisionMargin;
    });

    if (collidingPipe) {
        // Конвертация Y птицы в % (0 внизу, 100 вверху для ValueAxis)
        const birdYPercent = birdY / parentHeight;
        const birdYValue = 100 - (birdYPercent * 100);

        const gapBottom = collidingPipe.bottomY;
        const gapTop = collidingPipe.topOpen;

        if (debug) {
            console.log('Y collision check:', {birdY, birdYValue, gapBottom, gapTop});
        }

        // Увеличенный допуск для более мягкой коллизии
        if (birdYValue < gapBottom + 5 || birdYValue > gapTop - 5) {
            return true;
        }
    }
    return false;
};

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

        const chartDiv = document.getElementById("chartdiv");
        if (!chartDiv) return;

        const root = am5.Root.new("chartdiv");
        root.setThemes([am5themes_Animated.new(root)]);

        // Явно устанавливаем размеры для root в пикселях
        root.dom.style.width = `${containerWidth}px`;
        root.dom.style.height = `${containerHeight}px`;
        root.dom.style.maxWidth = `${containerWidth}px`;
        root.dom.style.maxHeight = `${containerHeight}px`;
        rootRef.current = root;


        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: false,
                panY: false,
                wheelX: "none",
                wheelY: "none",
                interactive: false,
                width: containerWidth,
                height: containerHeight
            })
        );
        chartRef.current = chart;

        const xAxis = chart.xAxes.push(
            am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererX.new(root, {minGridDistance: 100}),
                min: 0, max: 1000, strictMinMax: true
            })
        );
        xAxis.get("renderer").labels.template.set("forceHidden", true);
        xAxisRef.current = xAxis;

        const yAxis = chart.yAxes.push(
            am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererY.new(root, {}),
                min: 0, max: 100, strictMinMax: true
            })
        );
        yAxis.get("renderer").labels.template.set("forceHidden", true);

        // --- Стилизация труб ---
        // Применяем настройки напрямую к сериям, чтобы избежать проблем с объектами-шаблонами
        const commonSeriesSettings = {
            xAxis: xAxis,
            yAxis: yAxis,
            valueXField: "x",
            sequencedInterpolation: false,
        };

        // Нижние трубы
        const bottomSeries = chart.series.push(am5xy.ColumnSeries.new(root, {
            ...commonSeriesSettings,
            valueYField: "bottomY",
            openValueYField: "zero",
        }));
        // ВАЖНО: Устанавливаем ширину (width) прямо здесь
        bottomSeries.columns.template.setAll({
            width: PIPE_WIDTH, // 60px
            fill: am5.color(PIPE_COLOR),
            stroke: am5.color(PIPE_STROKE),
            strokeWidth: 2,
            centerX: am5.p50, // Центрируем, чтобы хитбокс работал от центра
            cornerRadiusTL: 4, cornerRadiusTR: 4
        });
        bottomSeriesRef.current = bottomSeries;

        // Верхние трубы
        const topSeries = chart.series.push(am5xy.ColumnSeries.new(root, {
            ...commonSeriesSettings,
            valueYField: "topY",
            openValueYField: "topOpen",
        }));
        topSeries.columns.template.setAll({
            width: PIPE_WIDTH,
            fill: am5.color(PIPE_COLOR),
            stroke: am5.color(PIPE_STROKE),
            strokeWidth: 2,
            centerX: am5.p50,
            cornerRadiusBL: 4, cornerRadiusBR: 4
        });
        topSeriesRef.current = topSeries;

        // Птица
        const birdContainer = chart.plotContainer.children.push(am5.Container.new(root, {
            x: 100, y: 250, centerX: am5.p50, centerY: am5.p50
        }));
        birdContainer.children.push(am5.Picture.new(root, {
            width: 45,  // 30px (база) * 1.5 (ваше масштабирование)
            height: 30, // 20px (база) * 1.5
            centerX: am5.p50,
            centerY: am5.p50,
            src: birdSvg.src, // .src берет URL из импорта Next.js
        }));

        // Debug: границы коллизий птицы
        if (showDebug) {
            birdContainer.children.push(am5.Rectangle.new(root, {
                width: 45,
                height: 30,
                fill: am5.color(0xff0000),
                fillOpacity: 0.3,
                stroke: am5.color(0xff0000),
                strokeWidth: 1,
                centerX: am5.p50,
                centerY: am5.p50
            }));
        }
        birdSpriteRef.current = birdContainer;

        // Debug: вертикальная линия показывающая позицию птицы на оси X
        if (showDebug) {
            const debugLine = chart.plotContainer.children.push(am5.Graphics.new(root, {
                stroke: am5.color(0x00ff00),
                strokeWidth: 2,
                strokeOpacity: 0.5
            }));
            debugLine.set("draw", (display) => {
                display.moveTo(100, 0);
                display.lineTo(100, containerHeight);
            });
        }

        return () => {
            if (rootRef.current) {
                rootRef.current.dispose();
                rootRef.current = null;
            }
        };
    }, []);

    // --- Цикл ---
    useEffect(() => {
        if (!isGameRunning || isGameOver) return;
        let animationFrameId: number;
        const loop = () => {
            const state = gameStateRef.current;
            const config = settingsRef.current;
            const root = rootRef.current;

            if (!root || !xAxisRef.current || !birdSpriteRef.current) {
                animationFrameId = requestAnimationFrame(loop);
                return;
            }

            // Физика
            state.birdVelocity += config.gravity;
            state.birdY += state.birdVelocity;
            birdSpriteRef.current.set("y", state.birdY);
            birdSpriteRef.current.set("rotation", Math.min(Math.max(state.birdVelocity * 3, -30), 90));

            // Мир
            state.axisXOffset += config.speed;
            const viewportWidth = 1000;
            xAxisRef.current.set("min", state.axisXOffset);
            xAxisRef.current.set("max", state.axisXOffset + viewportWidth);

            // Генерация
            if (state.axisXOffset + viewportWidth > state.lastPipeX + 400) {
                const newPipeX = state.lastPipeX + 400;
                const pipeData = generatePipeData(newPipeX);
                const dataItem = {...pipeData, zero: 0};
                state.pipes.push(dataItem);
                state.lastPipeX = newPipeX;

                const cleanPipes = state.pipes.filter(p => p.x > state.axisXOffset - 200);
                state.pipes = cleanPipes;

                if (bottomSeriesRef.current) bottomSeriesRef.current.data.setAll(cleanPipes);
                if (topSeriesRef.current) topSeriesRef.current.data.setAll(cleanPipes);
            }

            // Коллизии - используем фиксированные размеры
            if (checkCollision(state.birdY, state.pipes, state.axisXOffset, containerHeight, containerWidth, showDebug)) {
                gameOver();
                return;
            }

            // Счет
            const currentScore = Math.max(0, Math.floor((state.axisXOffset - 400) / 400));
            if (currentScore > score) setScore(currentScore);

            animationFrameId = requestAnimationFrame(loop);
        };
        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isGameRunning, isGameOver]);

    // --- UI ---
    const startGame = () => {
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
            xAxisRef.current.set("max", 1000);
        }
        jump();
    };
    const jump = () => {
        gameStateRef.current.birdVelocity = -JUMP_STRENGTH;
    };
    const gameOver = () => {
        setIsGameOver(true);
        setIsGameRunning(false);
    };

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
    }, [isGameRunning, isGameOver]);


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
                    <div id="chartdiv" style={{width: `${containerWidth}px`, height: `${containerHeight}px`}}></div>
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
                {showSettings &&
                    <div style={{
                        marginTop: '24px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '24px',
                        backgroundColor: '#f9fafb',
                        padding: '24px',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        width: `${containerWidth}px`
                    }}>
                        <div style={{display: 'flex', flexDirection: 'column'}}>
                            <label style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '8px',
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <span>Скорость:</span>
                                <span style={{color: '#0284c7'}}>{gameSpeed}</span>
                            </label>
                            <input
                                type="range"
                                min="2"
                                max="15"
                                step="1"
                                value={gameSpeed}
                                onChange={(e) => setGameSpeed(Number(e.target.value))}
                                disabled={isGameRunning}
                                style={{
                                    width: '100%',
                                    height: '8px',
                                    backgroundColor: '#d1d5db',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    accentColor: '#0284c7'
                                }}
                            />
                        </div>
                        <div style={{display: 'flex', flexDirection: 'column'}}>
                            <label style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '8px',
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <span>Гравитация:</span>
                                <span style={{color: '#0284c7'}}>{gravity}</span>
                            </label>
                            <input
                                type="range"
                                min="0.2"
                                max="1.5"
                                step="0.1"
                                value={gravity}
                                onChange={(e) => setGravity(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    height: '8px',
                                    backgroundColor: '#d1d5db',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    accentColor: '#0284c7'
                                }}
                            />
                        </div>
                    </div>
                }
            </div>
        </div>
    );
}