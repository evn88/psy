'use client';

import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/black.css';
import './presentation.scss';

import React, { useEffect, useRef, useState } from 'react';
import Reveal from "reveal.js";
import "reveal.js/plugin/highlight/monokai.css";
import SyntaxHighlighter from "react-syntax-highlighter";
import theme from "react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark";
import { HelloSection } from "@/app/(demo)/demo/_components/sections/HelloSection";
import AboutPresentation from "@/app/(demo)/demo/_components/sections/AboutPresentation";
import { GameSection } from "@/app/(demo)/demo/_components/sections/GameSection";
import RevealMarkdown from "reveal.js/plugin/markdown/markdown";

const codeString = `'use client'
import React from 'react';
import dynamic from "next/dynamic";

const RevealPresentation = dynamic(() => import('./_components/RevealPresentation'), {ssr: false});

const Demo = () => (
    <div className="w-full h-screen">
        <RevealPresentation/>
    </div>
);

export default Demo;`

const RevealPresentation = () => {
    const deckDivRef = useRef<HTMLDivElement>(null);
    const revealRef = useRef<Reveal.Api | null>(null);

    const [currentStep, setCurrentStep] = useState(0);


    useEffect(() => {
        if (revealRef.current) return;

        revealRef.current = new Reveal(deckDivRef.current!, {
            embedded: true,
            hash: true,
            controls: false,
            progress: false,
            center: false,
            transition: 'slide',
            plugins: [RevealMarkdown],
        });

        revealRef.current.initialize().then(() => {
            console.log("Reveal.js initialized.");

        })

        // В useEffect подписываемся на события Reveal.js
        revealRef.current.on('click', event => {
            console.log('Fragment shown: ', event);
            setCurrentStep(prevStep => prevStep + 1);
        });

        // Cleanup при размонтировании
        return () => {
            try {
                if (revealRef.current) {
                    revealRef.current.destroy();
                    revealRef.current = null;
                }
            } catch (e) {
                console.warn("Reveal.js destroy call failed.", e);
            }
        };
    }, []);


    return (
        <>
            <div className="reveal" ref={deckDivRef}>
                <div className="slides">
                    <HelloSection />
                    <AboutPresentation />
                    <GameSection />
                    <section>
                        <h2>Слайд с кодом</h2>
                        <SyntaxHighlighter
                            language="javascript"
                            style={theme}
                            wrapLines={true}
                            showLineNumbers={true}
                            lineProps={lineNumber => ({
                                style: {
                                    backgroundColor: lineNumber === currentStep ? '#2d323b' : 'transparent',
                                    display: 'block'
                                }
                            })}
                        >
                            {codeString}
                        </SyntaxHighlighter>
                    </section>
                    <section>
                        <section>
                            <h2>Вертикальный слайд 1</h2>
                        </section>
                        <section>
                            <h2>Вертикальный слайд 2</h2>
                        </section>
                    </section>
                </div>
            </div>
        </>
    );
};

export default RevealPresentation;