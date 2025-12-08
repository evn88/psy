'use client';
import React, { useEffect, useRef } from 'react';
import { animate, createScope, Scope, stagger } from 'animejs';

export const ModularitySection = () => {
  const root = useRef(null!);
  const scope = useRef<Scope>(null!);

  const playAnimation = () => {
    if (scope.current) scope.current.revert();
    scope.current = createScope({ root }).add(() => {
      animate('.anim-item', {
        opacity: [0, 1],
        translateY: [20, 0],
        delay: stagger(200),
        easing: 'easeOutQuad'
      });
    });
  };

  useEffect(() => {
    const section = root.current.closest('section');
    if (!section) return;

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (section.classList.contains('present')) {
            playAnimation();
          }
        }
      });
    });

    observer.observe(section, { attributes: true });

    if (section.classList.contains('present')) {
      playAnimation();
    }

    return () => {
      observer.disconnect();
      if (scope.current) scope.current.revert();
    };
  }, []);

  return (
    <section>
      <div ref={root} className="h-full flex flex-col justify-center items-center text-left">
        <h2 className="anim-item text-2xl mb-6 text-blue-400 font-bold">Модульность и Refs</h2>
        <div className="anim-item bg-gray-800/80 p-6 rounded-xl shadow-2xl w-4/5 max-w-4xl backdrop-blur-sm border border-gray-700">
          <p className="mb-4 text-lg text-gray-200">Инкапсуляция логики диаграммы:</p>
          <ul className="list-none pl-0 space-y-3 text-base text-gray-300">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 shrink-0"></span>
              <span>
                Используйте{' '}
                <code className="text-yellow-300 font-mono bg-gray-900 px-2 py-1 rounded text-sm">
                  useRef
                </code>{' '}
                для хранения инстанса.
              </span>
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 shrink-0"></span>
              <span>
                Инициализация в{' '}
                <code className="text-yellow-300 font-mono bg-gray-900 px-2 py-1 rounded text-sm">
                  useLayoutEffect
                </code>
                .
              </span>
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-red-500 rounded-full mr-3 shrink-0"></span>
              <span>
                Обязательный{' '}
                <code className="text-red-300 font-mono bg-gray-900 px-2 py-1 rounded text-sm">
                  root.dispose()
                </code>{' '}
                при размонтировании.
              </span>
            </li>
          </ul>
        </div>
        <div className="anim-item mt-6 w-4/5 max-w-4xl shadow-2xl">
          <pre className="!m-0 !shadow-none">
            <code className="language-typescript text-xs rounded-lg border border-gray-700 block !bg-[#1e1e1e] !p-4">
              {`const chartRef = useRef<am5.Root | null>(null);

useLayoutEffect(() => {
  const root = am5.Root.new("chartdiv");
  chartRef.current = root;
  
  // ... configuration ...

  return () => root.dispose();
}, []);`}
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
};
