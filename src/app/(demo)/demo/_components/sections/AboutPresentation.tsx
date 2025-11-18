'use client'

import React from 'react';
import Image from "next/image";
import '../presentation.scss';


const AboutPresentation = () => (
    <section className="h-full flex items-center justify-center relative text-2xl">
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight caveat-font">
            Ćao 👋️
        </h1>
        <div className="flex flex-col md:flex-row items-center w-full max-w-7xl mx-auto">
            {/* Левая колонка: Текст */}
            <div className="md:w-3/5 lg:w-1/2 space-y-8 text-center md:text-left">
                <div className="space-y-4">
                    <p className="text-2xl text-gray-500 caveat-font ">
                        Сегодня поговорим о библиотеке для создания диаграмм и графиков AmCharts.
                    </p>
                </div>
                <div className="space-y-5">
                    <h2 className="text-lg font-semibold caveat-font">
                        Для кого эта презентация?
                    </h2>
                    <p className="text-2xl text-gray-500 caveat-font">
                        Для всех, кто хочет узнать немного больше про магию визуализации 🪄
                    </p>
                </div>
            </div>

            {/* Правая колонка: Логотип */}
            <div className="md:w-2/5 lg:w-1/2 flex items-center justify-center mt-10 md:mt-0 md:pl-10">
                <Image
                    src={"https://www.amcharts.com/wp-content/themes/amcharts4/css/img/logo3.svg"}
                    alt="amCharts Logo"
                    width={256}
                    height={256}
                />
            </div>
        </div>
    </section>
);

export default AboutPresentation;