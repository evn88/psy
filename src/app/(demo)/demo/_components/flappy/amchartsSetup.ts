import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import {PIPE_COLOR, PIPE_STROKE, PIPE_WIDTH} from "./constants";

export const createRoot = (
    container: HTMLElement,
    width: number,
    height: number
) => {
    const root = am5.Root.new(container);
    root.setThemes([am5themes_Animated.new(root)]);

    // Явно устанавливаем размеры для root в пикселях
    root.dom.style.width = `${width}px`;
    root.dom.style.height = `${height}px`;
    root.dom.style.maxWidth = `${width}px`;
    root.dom.style.maxHeight = `${height}px`;

    return root;
};

export const createChart = (root: am5.Root, width: number, height: number) => {
    return root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: false,
            panY: false,
            wheelX: "none",
            wheelY: "none",
            interactive: false,
            width,
            height,
        })
    );
};

export const createAxes = (root: am5.Root, chart: am5xy.XYChart) => {
    const xAxis = chart.xAxes.push(
        am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererX.new(root, {minGridDistance: 100}),
            min: 0,
            max: 1000,
            strictMinMax: true,
        })
    );
    xAxis.get("renderer").labels.template.set("forceHidden", true);

    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {}),
            min: 0,
            max: 100,
            strictMinMax: true,
        })
    );
    yAxis.get("renderer").labels.template.set("forceHidden", true);

    return {xAxis, yAxis};
};

export const createPipesSeries = (
    root: am5.Root,
    chart: am5xy.XYChart,
    xAxis: am5xy.ValueAxis<am5xy.AxisRenderer>,
    yAxis: am5xy.ValueAxis<am5xy.AxisRenderer>
) => {
    const commonSeriesSettings = {
        xAxis,
        yAxis,
        valueXField: "x",
        sequencedInterpolation: false,
    } as const;

    // Нижние трубы
    const bottomSeries = chart.series.push(
        am5xy.ColumnSeries.new(root, {
            ...commonSeriesSettings,
            valueYField: "bottomY",
            openValueYField: "zero",
        })
    );
    bottomSeries.columns.template.setAll({
        width: PIPE_WIDTH,
        fill: am5.color(PIPE_COLOR),
        stroke: am5.color(PIPE_STROKE),
        strokeWidth: 2,
        centerX: am5.p50,
        cornerRadiusTL: 4,
        cornerRadiusTR: 4,
    });

    // Верхние трубы
    const topSeries = chart.series.push(
        am5xy.ColumnSeries.new(root, {
            ...commonSeriesSettings,
            valueYField: "topY",
            openValueYField: "topOpen",
        })
    );
    topSeries.columns.template.setAll({
        width: PIPE_WIDTH,
        fill: am5.color(PIPE_COLOR),
        stroke: am5.color(PIPE_STROKE),
        strokeWidth: 2,
        centerX: am5.p50,
        cornerRadiusBL: 4,
        cornerRadiusBR: 4,
    });

    return {bottomSeries, topSeries};
};

export const createBird = (
    root: am5.Root,
    chart: am5xy.XYChart,
    imageSrc: string,
    containerHeight: number,
    showDebug: boolean
) => {
    const birdContainer = chart.plotContainer.children.push(
        am5.Container.new(root, {
            x: 100,
            y: containerHeight / 2,
            centerX: am5.p50,
            centerY: am5.p50,
        })
    );
    birdContainer.children.push(
        am5.Picture.new(root, {
            width: 45,
            height: 30,
            centerX: am5.p50,
            centerY: am5.p50,
            src: imageSrc,
        })
    );

    if (showDebug) {
        birdContainer.children.push(
            am5.Rectangle.new(root, {
                width: 45,
                height: 30,
                fill: am5.color(0xff0000),
                fillOpacity: 0.3,
                stroke: am5.color(0xff0000),
                strokeWidth: 1,
                centerX: am5.p50,
                centerY: am5.p50,
            })
        );
    }

    return birdContainer;
};

export const createDebugBirdXLine = (
    root: am5.Root,
    chart: am5xy.XYChart,
    containerHeight: number
) => {
    const debugLine = chart.plotContainer.children.push(
        am5.Graphics.new(root, {
            stroke: am5.color(0x00ff00),
            strokeWidth: 2,
            strokeOpacity: 0.5,
        })
    );
    debugLine.set("draw", (display) => {
        display.moveTo(100, 0);
        display.lineTo(100, containerHeight);
    });
    return debugLine;
};
