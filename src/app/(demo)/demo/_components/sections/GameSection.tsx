'use client'

import FlappyBirdAmCharts from "../FlappyBirdAmCharts";


export const GameSection = () => {
    return (
        <section>
            <FlappyBirdAmCharts containerHeight={600} containerWidth={600} showDebug={true} />
        </section>
    );
};