import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';

// ==============================================
// 1. УТИЛИТЫ ЗАГРУЗКИ (LOADING UTILS)
// ==============================================

const checkGlobal = (key) => {
    if (key === 'am5themes_Animated') {
        return window.am5 && window.am5.themes && window.am5.themes.Animated;
    }
    return typeof window[key] !== 'undefined';
};

const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Не удалось загрузить скрипт: ${src}`));
        document.head.appendChild(script);
    });
};

const waitForGlobal = async (key, timeout = 10000) => {
    const startTime = Date.now();
    const interval = 200;
    while (!checkGlobal(key)) {
        if (Date.now() - startTime > timeout) throw new Error(`Timeout waiting for: ${key}`);
        await new Promise(resolve => setTimeout(resolve, interval));
    }
};

// ==============================================
// 2. КОНФИГУРАЦИЯ
// ==============================================

const BIRD_SVG_PATH = "M5,10 L15,5 L25,10 L25,20 L15,25 L5,20 Z";
const BIRD_COLOR = "#F4D03F";
const BIRD_STROKE = "#D4AC0D";
const PIPE_COLOR = "#73C6B6";
const PIPE_STROKE = "#16A085";
const PIPE_WIDTH = 60; // Визуальная ширина трубы в пикселях

const DEFAULT_GAME_SPEED = 5;
const DEFAULT_GRAVITY = 0.4;
const JUMP_STRENGTH = 8;

// ==============================================
// 3. ЛОГИКА ИГРЫ
// ==============================================

const generatePipeData = (xAxisValue, gapSize = 35, minPipeHeight = 10) => {
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

const checkCollision = (birdY, pipesData, currentXAxisMin, parentHeight) => {
    // 1. Пол и потолок
    if (birdY > parentHeight || birdY < 0) return true;

    // 2. Трубы
    const currentBirdAxisX = currentXAxisMin + 200;

    // Хитбокс: половина ширины трубы (радиус)
    const collisionMargin = PIPE_WIDTH / 2;

    const collidingPipe = pipesData.find(pipe => {
        // Проверяем, находится ли центр трубы достаточно близко к центру птицы по оси X
        return Math.abs(pipe.x - currentBirdAxisX) < collisionMargin;
    });

    if (collidingPipe) {
        // Конвертация Y птицы в % (0 внизу, 100 вверху для ValueAxis)
        const birdYPercent = birdY / parentHeight;
        const birdYValue = 100 - (birdYPercent * 100);

        const gapBottom = collidingPipe.bottomY;
        const gapTop = collidingPipe.topOpen;

        // Допуск 2 единицы внутрь дырки, чтобы не цеплять краями
        if (birdYValue < gapBottom + 2 || birdYValue > gapTop - 2) {
            return true;
        }
    }
    return false;
};

// ==============================================
// 4. КОМПОНЕНТ
// ==============================================

export default function FlappyBirdAmCharts() {
    const [isLibLoaded, setIsLibLoaded] = useState(false);
    const [loadingError, setLoadingError] = useState(null);

    const [score, setScore] = useState(0);
    const [isGameRunning, setIsGameRunning] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);

    const [gameSpeed, setGameSpeed] = useState(DEFAULT_GAME_SPEED);
    const [gravity, setGravity] = useState(DEFAULT_GRAVITY);

    const rootRef = useRef(null);
    const chartRef = useRef(null);
    const birdSpriteRef = useRef(null);
    const xAxisRef = useRef(null);
    const bottomSeriesRef = useRef(null);
    const topSeriesRef = useRef(null);

    const gameStateRef = useRef({
        birdY: 250,
        birdVelocity: 0,
        pipes: [],
        axisXOffset: 0,
        lastPipeX: 0
    });

    const settingsRef = useRef({ speed: DEFAULT_GAME_SPEED, gravity: DEFAULT_GRAVITY });
    useEffect(() => {
        settingsRef.current = { speed: Number(gameSpeed), gravity: Number(gravity) };
    }, [gameSpeed, gravity]);

    // --- Загрузка ---
    useEffect(() => {
        let isMounted = true;
        const initAmCharts = async () => {
            try {
                if (isMounted) setLoadingError(null);
                await loadScript("https://cdn.amcharts.com/lib/5/index.js");
                await waitForGlobal("am5", 10000);
                await loadScript("https://cdn.amcharts.com/lib/5/xy.js");
                await waitForGlobal("am5xy", 10000);
                try {
                    await loadScript("https://cdn.amcharts.com/lib/5/themes/Animated.js");
                    await waitForGlobal("am5themes_Animated", 3000);
                } catch (e) { console.warn("No animations"); }

                if (isMounted) setIsLibLoaded(true);
            } catch (e) {
                if (isMounted) setLoadingError(String(e.message || e));
            }
        };
        if (checkGlobal("am5") && checkGlobal("am5xy")) setIsLibLoaded(true);
        else initAmCharts();
        return () => { isMounted = false; };
    }, []);

    // --- График ---
    useLayoutEffect(() => {
        if (!isLibLoaded) return;
        const am5 = window.am5;
        const am5xy = window.am5xy;
        if (!am5 || !am5xy) return;

        if (rootRef.current) {
            rootRef.current.dispose();
            rootRef.current = null;
        }

        const root = am5.Root.new("chartdiv");
        rootRef.current = root;

        const am5themes_Animated = window.am5?.themes?.Animated;
        if (am5themes_Animated) root.setThemes([am5themes_Animated.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: "none", wheelY: "none", interactive: false })
        );
        chartRef.current = chart;

        const xAxis = chart.xAxes.push(
            am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 100 }),
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
        birdContainer.children.push(am5.Graphics.new(root, {
            svgPath: BIRD_SVG_PATH,
            fill: am5.color(BIRD_COLOR),
            stroke: am5.color(BIRD_STROKE),
            scale: 1.5
        }));
        birdSpriteRef.current = birdContainer;

        return () => {
            if (rootRef.current) {
                rootRef.current.dispose();
                rootRef.current = null;
            }
        };
    }, [isLibLoaded]);

    // --- Цикл ---
    useEffect(() => {
        if (!isGameRunning || isGameOver) return;
        let animationFrameId;
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
                const dataItem = { ...pipeData, zero: 0 };
                state.pipes.push(dataItem);
                state.lastPipeX = newPipeX;

                const cleanPipes = state.pipes.filter(p => p.x > state.axisXOffset - 200);
                state.pipes = cleanPipes;

                if (bottomSeriesRef.current) bottomSeriesRef.current.data.setAll(cleanPipes);
                if (topSeriesRef.current) topSeriesRef.current.data.setAll(cleanPipes);
            }

            // Коллизии
            const parentHeight = root.container.height();
            if (checkCollision(state.birdY, state.pipes, state.axisXOffset, parentHeight)) {
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
        if (!rootRef.current) return;
        const chartHeight = rootRef.current.container.height() || 500;
        gameStateRef.current = { birdY: chartHeight / 2, birdVelocity: 0, pipes: [], axisXOffset: 0, lastPipeX: 400 };
        setScore(0); setIsGameRunning(true); setIsGameOver(false);
        if (bottomSeriesRef.current) bottomSeriesRef.current.data.clear();
        if (topSeriesRef.current) topSeriesRef.current.data.clear();
        if (xAxisRef.current) { xAxisRef.current.set("min", 0); xAxisRef.current.set("max", 1000); }
        jump();
    };
    const jump = () => { gameStateRef.current.birdVelocity = -JUMP_STRENGTH; };
    const gameOver = () => { setIsGameOver(true); setIsGameRunning(false); };

    useEffect(() => {
        const handleSpaceKey = (e) => {
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

    if (loadingError) return <div className="text-red-500 p-4 text-center">Ошибка: {String(loadingError)} <br /><button onClick={() => window.location.reload()} className="mt-2 underline">Обновить</button></div>;
    if (!isLibLoaded) return <div className="flex h-screen items-center justify-center text-xl animate-pulse text-gray-600">Загрузка...</div>;

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto p-4 font-sans">
            <div className="relative w-full h-[500px] bg-sky-100 border-4 border-sky-700 rounded-lg overflow-hidden shadow-xl">
                <div id="chartdiv" className="w-full h-full"></div>
                <div className="absolute top-4 left-4 bg-white/80 px-4 py-2 rounded-full shadow-md z-10">
                    <span className="text-2xl font-bold text-gray-800">{score}</span>
                </div>
                {(!isGameRunning || isGameOver) && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full mx-4">
                            {isGameOver ? (
                                <>
                                    <h2 className="text-4xl font-black text-red-500 mb-2">GAME OVER</h2>
                                    <p className="text-xl text-gray-600 mb-4">Счет: {score}</p>
                                    <button onClick={startGame} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-lg transition shadow-lg">ЗАНОВО (Пробел)</button>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-4xl font-black text-sky-600 mb-2">FLAPPY CHART</h2>
                                    <button onClick={startGame} className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold text-lg transition shadow-lg animate-pulse">СТАРТ (Пробел)</button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 w-full bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex justify-between"><span>Скорость:</span><span className="text-sky-600">{gameSpeed}</span></label>
                    <input type="range" min="2" max="15" step="1" value={gameSpeed} onChange={(e) => setGameSpeed(Number(e.target.value))} disabled={isGameRunning} className="w-full h-2 bg-gray-300 rounded-lg cursor-pointer accent-sky-600" />
                </div>
                <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex justify-between"><span>Гравитация:</span><span className="text-sky-600">{gravity}</span></label>
                    <input type="range" min="0.2" max="1.5" step="0.1" value={gravity} onChange={(e) => setGravity(Number(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg cursor-pointer accent-sky-600" />
                </div>
            </div>
        </div>
    );
}