import React, {useEffect, useRef} from 'react';
import Image from "next/image";
import logoImg from "@/assets/images/sm.svg";
import {animate, createScope, Scope, spring} from "animejs";

export const HelloSection = () => {
    const root = useRef(null!);
    const scope = useRef<Scope>(null!);


    useEffect(() => {
        scope.current = createScope({root}).add(() => {
            animate('.smlogo', {
                scale: [{
                    to: 1.5,
                    ease: 'inOut(3)',
                    duration: 200,
                }, {to: 1, ease: spring({bounce: .7})}],
                loop: true,
                loopDelay: 200,

            })
        })

        return () => scope.current.revert()
    }, [])

    return (
        <section className="h-full">

            <div className="flex justify-center items-center flex-col h-full" ref={root}>
                <Image
                    src={logoImg}
                    alt="Logo"
                    width={128}
                    height={128}
                    className="smlogo rounded-lg p-1"
                />
                <p className={'text-white logoName'}>Smart Monitor</p>
            </div>
        </section>
    );
};
