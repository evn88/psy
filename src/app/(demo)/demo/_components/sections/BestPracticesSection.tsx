'use client';
import React, {useEffect, useRef} from 'react';
import {animate, createScope, Scope, stagger} from 'animejs';

export const BestPracticesSection = () => {
  const root = useRef(null!);
  const scope = useRef<Scope>(null!);

  const playAnimation = () => {
    if (scope.current) scope.current.revert();
    scope.current = createScope({ root }).add(() => {
      animate('.check-item', {
        translateX: [-50, 0],
        opacity: [0, 1],
        delay: stagger(150),
        easing: 'easeOutExpo'
      });
      animate('.title-underline', {
        width: ['0%', '100%'],
        duration: 800,
        easing: 'easeInOutQuad',
        delay: 200
      });
    });
  };

  useEffect(() => {
    const section = (root.current as HTMLElement)?.closest('section');
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
        <div className="mb-8 relative">
          <h2 className="text-2xl text-orange-400 font-bold">Best Practices & Твики</h2>
          <div className="title-underline absolute -bottom-2 left-0 h-1 bg-orange-500 rounded-full"></div>
        </div>

        <div className="w-4/5 max-w-4xl bg-gray-900/60 p-6 rounded-2xl border border-orange-500/20 backdrop-blur-md shadow-2xl">
          <ul className="space-y-5 text-base">
            <li className="check-item flex items-start">
              <span className="text-green-500 mr-3 mt-1 text-base">✔</span>
              <span className="text-gray-200">
                Всегда удаляйте root (
                <code className="text-sm bg-black/50 px-2 py-1 rounded text-orange-300 font-mono">
                  root.dispose()
                </code>
                ) во избежание утечек памяти.
              </span>
            </li>
            <li className="check-item flex items-start">
              <span className="text-green-500 mr-3 mt-1 text-base">✔</span>
              <span className="text-gray-200">
                Используйте <strong>Темы</strong> для консистентного стиля всего приложения.
              </span>
            </li>
            <li className="check-item flex items-start">
              <span className="text-green-500 mr-3 mt-1 text-base">✔</span>
              <span className="text-gray-200">
                Анимируйте появление данных с помощью{' '}
                <code className="text-sm bg-black/50 px-2 py-1 rounded text-orange-300 font-mono">
                  series.appear()
                </code>
                .
              </span>
            </li>
            <li className="check-item flex items-start">
              <span className="text-green-500 mr-3 mt-1 text-base">✔</span>
              <span className="text-gray-200">
                Используйте <strong>Lazy Loading</strong> данных для тяжелых графиков.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};
