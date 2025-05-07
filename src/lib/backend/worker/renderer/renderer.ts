import { TypstToCanvas } from "../../svg2canvas";

const pages: {
    canvas: TypstToCanvas;
    svg?: string;
}[] = [];


export const Renderer = {
    newPage(canvas: OffscreenCanvas, svg: string) {
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
            throw new Error("Failed to get 2D context");
        }

        const ttc = new TypstToCanvas(canvas, 900);

        ttc.renderSVG(svg);

        pages.push({
            canvas: ttc,
            svg,
        });
    }
}

export type Renderer = typeof Renderer;

export default Renderer;