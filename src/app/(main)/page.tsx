'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { animate, createScope, Scope } from 'animejs';
import AnnaPhoto from '@/assets/images/Anna.jpeg';
import BrainIcon from '@/assets/images/logo_orange.svg';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * Иконка Telegram (SVG)
 */
const TelegramIcon = ({ size = 20, className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn('shrink-0', className)}
    {...props}
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
  </svg>
);

/**
 * Иконка Instagram (SVG)
 */
const InstagramIcon = ({ size = 20, className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn('shrink-0', className)}
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

/**
 * Главная страница (Home Page)
 * Содержит информацию о психологе Анне Вершковой и контактные данные.
 * Использует next-intl для интернационализации текстов.
 */
interface HomePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const HomePage = ({ params: _params, searchParams: _searchParams }: HomePageProps) => {
  const t = useTranslations('Home');
  const containerRef = useRef<HTMLDivElement>(null);
  const scope = useRef<Scope>(null!);

  // Анимация при монтировании
  useEffect(() => {
    if (!containerRef.current) return;

    scope.current = createScope({ root: containerRef }).add(() => {
      // Анимация заголовка и карточек (плавное появление)
      animate('.stagger-fade-in', {
        opacity: [0, 1],
        translateY: [10, 0],
        delay: (el, i) => i * 150,
        easing: 'easeOutQuad',
        duration: 800
      });
    });

    return () => scope.current.revert();
  }, []);

  const tags = t.raw('tags') as string[];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-300 font-sans selection:bg-rose-500/30">
      <div
        ref={containerRef}
        className="max-w-4xl mx-auto flex flex-col md:flex-row gap-10 items-start justify-center pt-20 pb-12 px-6"
      >
        {/* --- Левая колонка: Фото (Полароид стиль) --- */}
        <div className="w-full md:w-5/12 flex justify-center stagger-fade-in relative z-10">
          <div className="bg-stone-900 p-3 pb-8 shadow-2xl rounded-sm transform -rotate-1 border border-stone-800 max-w-[320px]">
            <div className="relative w-full aspect-[3/4] overflow-hidden bg-stone-800 mb-4 rounded-sm">
              <div className="absolute inset-0 flex items-center justify-center text-stone-600 bg-stone-800">
                <span className="text-sm">{t('photoCaption')}</span>
              </div>
              <Image
                src={AnnaPhoto}
                alt={t('photoAlt')}
                fill
                className="object-cover"
                placeholder="blur"
              />
            </div>
            <div className="text-center font-handwriting text-stone-400 font-medium">
              {t('subtitle')}
            </div>

            {/* Декоративный «скотч» сверху */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-24 h-8 bg-rose-900/30 rotate-1 shadow-sm backdrop-blur-[2px]"></div>
          </div>
        </div>

        {/* --- Правая колонка: Контент --- */}
        <div className="w-full md:w-7/12 space-y-8">
          <header className="stagger-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Image src={BrainIcon} alt={'Brain logo'} width={40} className={'text-amber-500'} />
              <span className="text-amber-500 font-bold uppercase text-xl tracking-wider">
                {t('badge')}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-stone-100 pt-2">
              {t('name')}
            </h1>
            <h2 className="text-lg md:text-xl text-stone-400 font-light leading-relaxed">
              {t('tagline')}
            </h2>
          </header>

          {/* Теги компетенций */}
          <div className="flex flex-wrap gap-2 stagger-fade-in">
            {tags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 bg-stone-900 text-stone-400 rounded-full text-sm font-medium border border-stone-800"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="prose prose-lg prose-invert leading-relaxed space-y-5 text-stone-300 stagger-fade-in">
            <p>{t('intro')}</p>
            <p className="border-l-4 border-rose-500/50 pl-4 italic bg-stone-900/40 py-3 pr-3 rounded-r-md text-stone-200">
              {t('quote')}
            </p>

            <h3 className="text-xl font-bold pt-2 text-stone-100">{t('workTitle')}</h3>
            <ul className="list-disc list-inside space-y-2 marker:text-amber-500">
              <li>{t('work1')}</li>
              <li>{t('work2')}</li>
              <li>{t('work3')}</li>
              <li>{t('work4')}</li>
            </ul>
          </div>

          <div className="pt-8 stagger-fade-in">
            <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 shadow-xl overflow-hidden relative group/card">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <TelegramIcon size={120} />
              </div>

              <h3 className="text-lg font-semibold mb-6 text-stone-200 relative z-10">
                {t('contactTitle')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                <Button
                  asChild
                  size="lg"
                  className="h-14 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-sky-900/30 active:scale-95 group/btn"
                >
                  <a href="https://t.me/looking_dopamine" target="_blank" rel="noopener noreferrer">
                    <TelegramIcon />
                    <span className="truncate">{t('telegramLink')}</span>
                  </a>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-2xl border-stone-800 bg-stone-950/50 hover:bg-pink-500/5 hover:border-pink-500/50 text-stone-300 hover:text-stone-100 font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 group/btn"
                >
                  <a
                    href="https://www.instagram.com/ania_vverh"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <InstagramIcon className="group-hover/btn:text-pink-500 transition-colors" />
                    <span>{t('instagramLink')}</span>
                  </a>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-2xl border-stone-800 bg-stone-950/50 hover:bg-amber-500/5 hover:border-amber-500/50 text-stone-300 hover:text-stone-100 font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-95 group/btn"
                >
                  <Link href="/blog">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5 group-hover/btn:text-amber-500 transition-colors"
                    >
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    <span>{t('blogLink')}</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
