import React, {useEffect, useRef} from 'react';
import Image from "next/image";
import logoImg from "@/assets/images/sm.svg";
import {animate, createScope, createTimer, Scope, spring} from "animejs";

export const HelloSection = () => {
    const root = useRef(null!);
    const scope = useRef<Scope>(null!);


    useEffect(() => {
        scope.current = createScope({root}).add(self => {
            const pulse = animate('.smlogo', {
                scale: [{
                    to: 1.5,
                    ease: 'inOut(3)',
                    duration: 200,
                }, {to: 1, ease: spring({bounce: .7})}],

            })

            pulse.onComplete = () => {
                const rotate = animate('.smlogo', {
                    rotate: [{
                        from: 0,
                        to: 360,
                        ease: 'inOut(2)',
                        duration: 800,
                    }],
                })

                rotate.onComplete = () => {
                    createTimer({
                        duration: 250,
                        onComplete: () => {
                            pulse.restart()
                        }
                    });
                }
            }

            // animate('.smlogo', {
            //     scale: [{
            //         to: 1.5,
            //         ease: 'inOut(3)',
            //         duration: 200,
            //     }, {to: 1, ease: spring({bounce: .7})}],
            //     rotate: [{
            //         to: 360,
            //         ease: 'inOut(2)',
            //         duration: 800,
            //     }],
            //     loop: true,
            //     loopDelay: 250,
            // })


            // const {chars} = splitText('.logoName', {chars: true});

            // animate(chars, {
            //     scale: [{
            //         to: 1.5,
            //         ease: 'inOut(3)',
            //         duration: 300,
            //     }, {
            //         to: 1,
            //         ease: spring({bounce: .7})
            //     }],
            //     delay: function (el, i) {
            //         return i * 100;
            //     },
            //     loop: true,
            //     loopDelay: 5000,
            // })
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
