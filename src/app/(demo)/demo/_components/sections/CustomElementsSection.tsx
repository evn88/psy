'use client';
import React, { useEffect, useRef } from 'react';
import { animate, createScope, Scope } from 'animejs';

export const CustomElementsSection = () => {
  const root = useRef<HTMLDivElement | null>(null);
  const scope = useRef<Scope>(null!);

  const playAnimation = () => {
    if (scope.current) scope.current.revert();
    scope.current = createScope({ root }).add(() => {
      animate('.custom-el-circle', {
        scale: [0, 1],
        rotate: [0, 360],
        duration: 1200,
        delay: 500,
        easing: 'spring(1, 80, 10, 0)'
      });
      animate('.text-content', {
        opacity: [0, 1],
        translateX: [-50, 0],
        duration: 800,
        delay: 200,
        easing: 'easeOutQuad'
      });
    });
  };

  useEffect(() => {
    const section = root.current?.closest('section');
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
      <div ref={root} className="h-full flex flex-col justify-center items-center">
        <h2 className="text-content text-2xl mb-8 text-purple-400 font-bold tracking-wide">
          Кастомные Элементы
        </h2>
        <div className="flex flex-row items-center justify-between w-full max-w-5xl px-8">
          <div className="text-content w-1/2 text-left space-y-4">
            <p className="text-xl font-light text-gray-200">
              Полный контроль над позиционированием
            </p>
            <div className="h-1 w-16 bg-purple-500 rounded"></div>
            <ul className="space-y-3 text-base text-gray-300">
              <li className="flex items-center">
                <span className="text-lg mr-3">🎯</span>
                <strong>Container</strong> — для группировки элементов.
              </li>
              <li className="flex items-center">
                <span className="text-lg mr-3">📍</span>
                Абсолютное позиционирование (x, y, centerX, centerY).
              </li>
              <li className="flex items-center">
                <span className="text-lg mr-3">🎨</span>
                Рисование фигур (Circle, Rectangle, Label).
              </li>
              <li className="flex items-center">
                <span className="text-lg mr-3">✨</span>
                Интерактивность через события (events).
              </li>
            </ul>
          </div>
          <div className="w-1/2 flex justify-center items-center relative h-56">
            <div className="custom-el-circle w-40 h-40 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.5)] border-4 border-white/20 relative z-10">
              <span className="text-3xl font-bold text-white drop-shadow-md">am5</span>
            </div>
            <div className="custom-el-circle absolute w-56 h-56 border-2 border-dashed border-purple-400/30 rounded-full animate-spin-slow z-0"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
