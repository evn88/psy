"use client"

import React, {FC, useEffect, useRef} from 'react'
import {animate, createScope, Scope, splitText, spring} from "animejs";

type MainPageProps = object

const MainPage: FC<MainPageProps> = () => {
    const root = useRef(null!);
    const scope = useRef<Scope>(null!);

    useEffect(() => {
        scope.current = createScope({root}).add(() => {
            const {chars} = splitText('.soonText', {chars: true});

            animate(chars, {
                scale: [{
                    to: 1.3,
                    ease: 'inOut(3)',
                    duration: 300,
                }, {
                    to: 1,
                    ease: spring({bounce: .7})
                }],
                delay: function (el, i) {
                    return i * 100;
                },
                loop: true,
                loopDelay: 5000,
            })
        })

        return () => scope.current.revert()
    }, [])


    return (
        <div className="container mx-auto" ref={root}>
            <h1 className="text-4xl font-bold">Hello, this site is under construction</h1>
            <p className="mt-4 soonText">Something interesting will be here soon.</p>
        </div>
    );
}

export default MainPage;