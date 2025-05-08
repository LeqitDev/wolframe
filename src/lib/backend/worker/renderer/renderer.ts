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

        const ttc = new TypstToCanvas(canvas, 500);

        ttc.renderSVG(svg);

        pages.push({
            canvas: ttc,
            svg,
        });
    },
    update(pageId: number, svg?: string) {
        console.log("Updating page", pageId, svg);
        const page = pages[pageId];

        if (!page) {
            throw new Error(`Page with id ${pageId} not found`);
        }

        if (svg) {
            page.svg = svg;
        }

        page.canvas.renderSVG(page.svg ?? "");

    }
}

export type Renderer = typeof Renderer;

export default Renderer;