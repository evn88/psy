'use client';
import React, { useEffect, useRef } from 'react';
import { animate, createScope, Scope, stagger } from 'animejs';

export const FlexibilitySection = () => {
  const root = useRef(null!);
  const scope = useRef<Scope>(null!);

  const playAnimation = () => {
    if (scope.current) scope.current.revert();
    scope.current = createScope({ root }).add(() => {
      animate('.flex-card', {
        translateY: [50, 0],
        opacity: [0, 1],
        delay: stagger(100),
        easing: 'spring(1, 80, 10, 0)'
      });
      animate('.quote', {
        opacity: [0, 1],
        scale: [0.9, 1],
        delay: 1000,
        duration: 800
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

  const features = [
    { title: 'Сложные Дашборды', icon: '📊' },
    { title: 'Карты и Гео', icon: '🌍' },
    { title: 'Gantt Charts', icon: '📅' },
    { title: 'Stock Charts', icon: '📈' },
    { title: 'Force Directed', icon: '🕸️' },
    { title: 'Sankey Diagrams', icon: '🔀' }
  ];

  return (
    <section>
      <div ref={root} className="h-full flex flex-col justify-center items-center">
        <h2 className="text-2xl mb-8 text-green-400 font-bold tracking-tight">
          Безграничная Гибкость
        </h2>
        <div className="grid grid-cols-3 gap-4 w-full max-w-4xl px-4">
          {features.map((feat, i) => (
            <div
              key={i}
              className="flex-card bg-gray-800/60 p-3 rounded-lg border border-gray-700 hover:bg-gray-700/80 transition-all hover:scale-105 cursor-default backdrop-blur-sm flex flex-col items-center justify-center gap-2 group min-h-[100px]"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                {feat.icon}
              </span>
              <h3 className="text-sm font-medium text-center text-gray-200 leading-tight">
                {feat.title}
              </h3>
            </div>
          ))}
        </div>
        <p className="quote mt-8 text-gray-400 text-lg italic font-serif border-l-4 border-green-500 pl-4">
          "Если вы можете это представить, <span className="text-green-400">amCharts</span> может
          это нарисовать"
        </p>
      </div>
    </section>
  );
};
