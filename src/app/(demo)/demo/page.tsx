'use client'
import React from 'react';
import dynamic from "next/dynamic";


const RevealPresentation = dynamic(() => import('./_components/RevealPresentation'), {ssr: false});

const Demo = () => (
    <div className="w-full h-screen">
        <RevealPresentation/>
    </div>
);

export default Demo;