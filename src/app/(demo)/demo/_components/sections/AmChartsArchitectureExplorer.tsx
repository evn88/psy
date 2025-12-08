'use client';

import React, { useState } from 'react';

type TargetId =
  | 'root'
  | 'chart'
  | 'y-axis'
  | 'x-axis'
  | 'series'
  | 'column-template'
  | 'svg-graphic'
  | null;

export default function AmChartsArchitectureExplorer() {
  const [activeTarget, setActiveTarget] = useState<TargetId>(null);

  const handleMouseEnter = (targetId: TargetId) => {
    setActiveTarget(targetId);
  };

  const handleMouseLeave = () => {
    setActiveTarget(null);
  };

  const isActive = (targetId: TargetId) => activeTarget === targetId;

  return (
    <section>
      <div className="bg-slate-100 h-screen flex flex-col overflow-hidden font-sans">
        <style jsx>{`
          .code-bg {
            background-color: #282c34;
            color: #abb2bf;
          }
          .c-keyword {
            color: #c678dd;
          }
          .c-func {
            color: #61afef;
          }
          .c-string {
            color: #98c379;
          }
          .c-obj {
            color: #e5c07b;
          }
          .c-comment {
            color: #7f848e;
            font-style: italic;
          }

          .interactive-line {
            display: block;
            padding: 2px 8px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.1s;
            border-left: 3px solid transparent;
          }
          .interactive-line:hover {
            background-color: #3e4451;
            border-left-color: #61afef;
          }

          .viz-box {
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            border: 1px dashed #cbd5e1;
            position: relative;
            background-color: rgba(255, 255, 255, 0.5);
          }

          .viz-tag {
            position: absolute;
            top: -10px;
            left: 10px;
            background: #64748b;
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
            pointer-events: none;
            opacity: 0.7;
            z-index: 10;
            transition: all 0.2s;
          }

          .is-active {
            box-shadow:
              0 0 0 2px #3b82f6,
              0 0 20px rgba(59, 130, 246, 0.3) !important;
            background-color: rgba(59, 130, 246, 0.1) !important;
            border-color: #3b82f6 !important;
            border-style: solid !important;
            z-index: 50 !important;
          }
          .is-active .viz-tag {
            background: #3b82f6;
            opacity: 1;
            transform: scale(1.1);
          }

          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #21252b;
          }
          ::-webkit-scrollbar-thumb {
            background: #4b5263;
            border-radius: 4px;
          }
        `}</style>

        {/* Main Layout */}
        <main className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL: CODE */}
          <div className="w-1/2 code-bg overflow-y-auto font-mono text-xs md:text-sm leading-6 p-6 border-r border-slate-700 shadow-inner">
            {/* Root */}
            <div
              className="interactive-line group"
              onMouseEnter={() => handleMouseEnter('root')}
              onMouseLeave={handleMouseLeave}
            >
              <span className="c-keyword">let</span> root = am5.Root.
              <span className="c-func">new</span>(<span className="c-string">"chartdiv"</span>);
            </div>
            <div className="mb-4"></div>

            {/* Chart Container */}
            <div
              className="interactive-line group"
              onMouseEnter={() => handleMouseEnter('chart')}
              onMouseLeave={handleMouseLeave}
            >
              <span className="c-keyword">let</span> chart = root.container.children.
              <span className="c-func">push</span>(
            </div>
            <div
              className="interactive-line group pl-4"
              onMouseEnter={() => handleMouseEnter('chart')}
              onMouseLeave={handleMouseLeave}
            >
              am5xy.XYChart.<span className="c-func">new</span>(root, {'{'}
            </div>
            <div
              className="interactive-line group pl-8"
              onMouseEnter={() => handleMouseEnter('chart')}
              onMouseLeave={handleMouseLeave}
            >
              panX: <span className="c-keyword">true</span>, panY:{' '}
              <span className="c-keyword">true</span>, layout: root.verticalLayout
            </div>
            <div
              className="interactive-line group pl-4"
              onMouseEnter={() => handleMouseEnter('chart')}
              onMouseLeave={handleMouseLeave}
            >
              {'}'})
            </div>
            <div
              className="interactive-line group"
              onMouseEnter={() => handleMouseEnter('chart')}
              onMouseLeave={handleMouseLeave}
            >
              );
            </div>
            <div className="mb-4"></div>

            {/* Y Axis */}
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('y-axis')}
              onMouseLeave={handleMouseLeave}
            >
              <span className="c-comment">// Ось Y (Сетка и лейблы слева)</span>
            </div>
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('y-axis')}
              onMouseLeave={handleMouseLeave}
            >
              <span className="c-keyword">let</span> yRenderer = am5xy.AxisRendererY.
              <span className="c-func">new</span>(root, {'{}{}'});
            </div>
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('y-axis')}
              onMouseLeave={handleMouseLeave}
            >
              <span className="c-keyword">let</span> yAxis = chart.yAxes.
              <span className="c-func">push</span>(
            </div>
            <div
              className="interactive-line pl-4"
              onMouseEnter={() => handleMouseEnter('y-axis')}
              onMouseLeave={handleMouseLeave}
            >
              am5xy.ValueAxis.<span className="c-func">new</span>(root, {'{'}
            </div>
            <div
              className="interactive-line pl-8"
              onMouseEnter={() => handleMouseEnter('y-axis')}
              onMouseLeave={handleMouseLeave}
            >
              renderer: yRenderer
            </div>
            <div
              className="interactive-line pl-4"
              onMouseEnter={() => handleMouseEnter('y-axis')}
              onMouseLeave={handleMouseLeave}
            >
              {'}'})
            </div>
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('y-axis')}
              onMouseLeave={handleMouseLeave}
            >
              );
            </div>
            <div className="mb-4"></div>

            {/* X Axis */}
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('x-axis')}
              onMouseLeave={handleMouseLeave}
            >
              <span className="c-comment">// Ось X (Категории снизу)</span>
            </div>
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('x-axis')}
              onMouseLeave={handleMouseLeave}
            >
              <span className="c-keyword">let</span> xRenderer = am5xy.AxisRendererX.
              <span className="c-func">new</span>(root, {'{}{}'});
            </div>
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('x-axis')}
              onMouseLeave={handleMouseLeave}
            >
              <span className="c-keyword">let</span> xAxis = chart.xAxes.
              <span className="c-func">push</span>(
            </div>
            <div
              className="interactive-line pl-4"
              onMouseEnter={() => handleMouseEnter('x-axis')}
              onMouseLeave={handleMouseLeave}
            >
              am5xy.CategoryAxis.<span className="c-func">new</span>(root, {'{'}
            </div>
            <div
              className="interactive-line pl-8"
              onMouseEnter={() => handleMouseEnter('x-axis')}
              onMouseLeave={handleMouseLeave}
            >
              renderer: xRenderer, categoryField: <span className="c-string">"category"</span>
            </div>
            <div
              className="interactive-line pl-4"
              onMouseEnter={() => handleMouseEnter('x-axis')}
              onMouseLeave={handleMouseLeave}
            >
              {'}'})
            </div>
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('x-axis')}
              onMouseLeave={handleMouseLeave}
            >
              );
            </div>
            <div className="mb-4"></div>

            {/* Series */}
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('series')}
              onMouseLeave={handleMouseLeave}
            >
              <span className="c-comment">// Серия (Контейнер для всех столбцов)</span>
            </div>
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('series')}
              onMouseLeave={handleMouseLeave}
            >
              <span className="c-keyword">let</span> series = chart.series.
              <span className="c-func">push</span>(
            </div>
            <div
              className="interactive-line pl-4"
              onMouseEnter={() => handleMouseEnter('series')}
              onMouseLeave={handleMouseLeave}
            >
              am5xy.ColumnSeries.<span className="c-func">new</span>(root, {'{'}
            </div>
            <div
              className="interactive-line pl-8"
              onMouseEnter={() => handleMouseEnter('series')}
              onMouseLeave={handleMouseLeave}
            >
              name: <span className="c-string">"Series 1"</span>, xAxis: xAxis, yAxis: yAxis,
              valueYField: <span className="c-string">"value"</span>, categoryXField:{' '}
              <span className="c-string">"category"</span>
            </div>
            <div
              className="interactive-line pl-4"
              onMouseEnter={() => handleMouseEnter('series')}
              onMouseLeave={handleMouseLeave}
            >
              {'}'})
            </div>
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('series')}
              onMouseLeave={handleMouseLeave}
            >
              );
            </div>
            <div className="mb-4"></div>

            {/* Template */}
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('column-template')}
              onMouseLeave={handleMouseLeave}
            >
              <span className="c-comment">// Шаблон (Влияет на каждый столбец)</span>
            </div>
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('column-template')}
              onMouseLeave={handleMouseLeave}
            >
              series.columns.template.<span className="c-func">setAll</span>({'{'}
            </div>
            <div
              className="interactive-line pl-4"
              onMouseEnter={() => handleMouseEnter('column-template')}
              onMouseLeave={handleMouseLeave}
            >
              width: am5.<span className="c-func">percent</span>(<span className="c-obj">90</span>),
            </div>
            <div
              className="interactive-line pl-4"
              onMouseEnter={() => handleMouseEnter('column-template')}
              onMouseLeave={handleMouseLeave}
            >
              fillOpacity: <span className="c-obj">0</span>{' '}
              <span className="c-comment">// Скрываем стандартный прямоугольник</span>
            </div>
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('column-template')}
              onMouseLeave={handleMouseLeave}
            >
              {'}'});
            </div>

            {/* SVG Logic */}
            <div
              className="interactive-line mt-2"
              onMouseEnter={() => handleMouseEnter('svg-graphic')}
              onMouseLeave={handleMouseLeave}
            >
              <span className="c-comment">// Добавляем "Гриб" внутрь столбца</span>
            </div>
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('svg-graphic')}
              onMouseLeave={handleMouseLeave}
            >
              series.columns.template.children.<span className="c-func">push</span>(
            </div>
            <div
              className="interactive-line pl-4"
              onMouseEnter={() => handleMouseEnter('svg-graphic')}
              onMouseLeave={handleMouseLeave}
            >
              am5.Graphics.<span className="c-func">new</span>(root, {'{'}
            </div>
            <div
              className="interactive-line pl-8"
              onMouseEnter={() => handleMouseEnter('svg-graphic')}
              onMouseLeave={handleMouseLeave}
            >
              svgPath: <span className="c-string">"M..."</span>, width: am5.
              <span className="c-obj">p100</span>,{' '}
              <span className="c-comment">// Растянуть ширину</span>
              height: am5.<span className="c-obj">p100</span>{' '}
              <span className="c-comment">// Растянуть высоту</span>
            </div>
            <div
              className="interactive-line pl-4"
              onMouseEnter={() => handleMouseEnter('svg-graphic')}
              onMouseLeave={handleMouseLeave}
            >
              {'}'})
            </div>
            <div
              className="interactive-line"
              onMouseEnter={() => handleMouseEnter('svg-graphic')}
              onMouseLeave={handleMouseLeave}
            >
              );
            </div>
          </div>

          {/* RIGHT PANEL: SCHEMA (DOM) */}
          <div className="w-1/2 bg-white relative flex items-center justify-center p-8 overflow-hidden">
            {/* Background Grid */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            ></div>

            {/* LEVEL 1: ROOT */}
            <div
              className={`viz-box bg-slate-50 w-full max-w-xl h-[500px] p-4 flex flex-col shadow-xl rounded-lg ${isActive('root') ? 'is-active' : ''}`}
            >
              <div className="viz-tag">Root (div#chartdiv)</div>

              {/* LEVEL 2: CONTAINER */}
              <div className="viz-box border-dashed border-slate-300 flex-1 p-2 flex flex-col relative mt-4">
                <div className="viz-tag">root.container</div>

                {/* LEVEL 3: CHART */}
                <div
                  className={`viz-box bg-white border-2 border-blue-100 flex-1 flex flex-col p-2 relative shadow-sm mt-4 ${isActive('chart') ? 'is-active' : ''}`}
                >
                  <div className="viz-tag bg-blue-500 text-white">XYChart (Container)</div>

                  <div className="flex flex-1 w-full relative mt-4">
                    {/* Y AXIS */}
                    <div
                      className={`viz-box w-12 border-r border-slate-200 flex flex-col justify-between py-6 pr-1 mr-1 bg-slate-50/50 ${isActive('y-axis') ? 'is-active' : ''}`}
                    >
                      <div className="viz-tag left-[-5px] top-[-8px] scale-75">YAxis</div>
                      <div className="text-[9px] text-right text-slate-400">100</div>
                      <div className="text-[9px] text-right text-slate-400">50</div>
                      <div className="text-[9px] text-right text-slate-400">0</div>
                    </div>

                    {/* PLOT AREA */}
                    <div className="flex-1 relative border border-slate-100 bg-slate-50/30">
                      {/* Grid */}
                      <div className="absolute inset-0 flex flex-col justify-between py-6 opacity-30 pointer-events-none">
                        <div className="border-t border-slate-400 w-full h-0"></div>
                        <div className="border-t border-slate-400 w-full h-0"></div>
                        <div className="border-t border-slate-400 w-full h-0"></div>
                      </div>

                      {/* SERIES CONTAINER */}
                      <div
                        className={`viz-box absolute inset-0 flex items-end justify-around px-4 pb-[1px] border-none ${isActive('series') ? 'is-active' : ''}`}
                      >
                        <div className="viz-tag top-[50%] left-[50%] translate-x-[-50%] bg-emerald-600">
                          ColumnSeries
                        </div>

                        {/* Column 1 */}
                        <div
                          className={`viz-box w-10 h-[60%] bg-blue-100 border-blue-300 relative group flex items-end ${isActive('column-template') ? 'is-active' : ''}`}
                        >
                          <div
                            className={`viz-box w-full h-full border-red-300 bg-red-50/50 absolute inset-0 flex items-center justify-center overflow-hidden ${isActive('svg-graphic') ? 'is-active' : ''}`}
                          >
                            <span className="text-[8px] text-red-400 font-mono text-center leading-tight absolute top-2">
                              SVG
                              <br />
                              Path
                            </span>
                            <span className="material-symbols-outlined text-red-500 absolute bottom-0 text-4xl opacity-50">
                              forest
                            </span>
                          </div>
                        </div>

                        {/* Column 2 */}
                        <div className="viz-box w-10 h-[80%] bg-blue-100 border-blue-300 relative flex items-end">
                          <div className="viz-box w-full h-full border-red-300 bg-red-50/50 absolute inset-0 flex items-center justify-center overflow-hidden">
                            <span className="material-symbols-outlined text-red-500 absolute bottom-0 text-4xl opacity-50">
                              forest
                            </span>
                          </div>
                        </div>

                        {/* Column 3 */}
                        <div className="viz-box w-10 h-[40%] bg-blue-100 border-blue-300 relative flex items-end">
                          <div className="viz-box w-full h-full border-red-300 bg-red-50/50 absolute inset-0 flex items-center justify-center overflow-hidden">
                            <span className="material-symbols-outlined text-red-500 absolute bottom-0 text-4xl opacity-50">
                              forest
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* X AXIS */}
                  <div className="flex w-full pl-14 pt-1">
                    <div
                      className={`viz-box flex-1 h-8 bg-slate-50/50 border-t border-slate-200 flex justify-around items-center ${isActive('x-axis') ? 'is-active' : ''}`}
                    >
                      <div className="viz-tag scale-75 bottom-[-5px] top-auto">XAxis</div>
                      <span className="text-[9px] text-slate-500">A</span>
                      <span className="text-[9px] text-slate-500">B</span>
                      <span className="text-[9px] text-slate-500">C</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}
