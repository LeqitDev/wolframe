import { DOMParser as XMLDOMParser, Element as XMLElement } from '@xmldom/xmldom';

abstract class Renderable {
    abstract render(ctx: SuitableCanvasContext, glyphs: Map<string, Path2D>): void;
}

type SuitableCanvas = HTMLCanvasElement | OffscreenCanvas;
type SuitableCanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

class TypstUse extends Renderable {
    href: string = '';
    x?: number;
    y?: number;
    fill?: string;
    fill_rule?: string;

    fromElement(use: Element) {
        this.href = use.raw.getAttribute('xlink:href') || '';
        this.x = use.raw.getAttribute('x') ? parseFloat(use.raw.getAttribute('x')!) : undefined;
        this.y = use.raw.getAttribute('y') ? parseFloat(use.raw.getAttribute('y')!) : undefined;
        this.fill = use.raw.getAttribute('fill') || undefined;
        this.fill_rule = use.raw.getAttribute('fill-rule') || undefined;
    }

    render(ctx: SuitableCanvasContext, glyphs: Map<string, Path2D>): void {
        const d = this.href.startsWith('#') ? glyphs.get(this.href.slice(1)) : undefined;
        if (d) {
            if (this.x || this.y) {
                ctx.save();
                ctx.translate(this.x || 0, this.y || 0);
            }
            ctx.fillStyle = this.fill || 'black';
            ctx.fill(d);
            if (this.x || this.y) {
                ctx.restore();
            }
        }
    }
}

class TypstPath extends Renderable {
    d: string = '';
    stroke?: string;
    stroke_width?: string;
    stroke_linecap?: string;
    stroke_linejoin?: string;
    stroke_dasharray?: string;
    stroke_dashoffset?: string;
    fill?: string;
    fill_rule?: string;

    fromElement(path: Element) {
        this.d = path.raw.getAttribute('d') || '';
        this.fill = path.raw.getAttribute('fill') || undefined;
        this.fill_rule = path.raw.getAttribute('fill-rule') || undefined;
        this.stroke = path.raw.getAttribute('stroke') || undefined;
        this.stroke_width = path.raw.getAttribute('stroke-width') || undefined;
        this.stroke_linecap = path.raw.getAttribute('stroke-linecap') || undefined;
        this.stroke_linejoin = path.raw.getAttribute('stroke-linejoin') || undefined;
        this.stroke_dasharray = path.raw.getAttribute('stroke-dasharray') || undefined;
        this.stroke_dashoffset = path.raw.getAttribute('stroke-dashoffset') || undefined;
    }

    render(ctx: SuitableCanvasContext): void {
        const path2d = new Path2D(this.d);

        if (this.fill && this.fill !== 'none') {
            ctx.fillStyle = this.fill;
            
            ctx.fill(path2d, this.fillRule());
        } else if (this.stroke && this.stroke !== 'none' && this.stroke_width && parseFloat(this.stroke_width) > 0) {
            ctx.strokeStyle = this.stroke;
            ctx.lineWidth = parseFloat(this.stroke_width || '1');
            
            if (this.stroke_linecap) ctx.lineCap = this.stroke_linecap as CanvasLineCap;
            if (this.stroke_linejoin) ctx.lineJoin = this.stroke_linejoin as CanvasLineJoin;
            if (this.stroke_dasharray) {
                ctx.setLineDash(this.stroke_dasharray.split(',').map(parseFloat));
            }
            if (this.stroke_dashoffset) {
                ctx.lineDashOffset = parseFloat(this.stroke_dashoffset);
            }
            ctx.stroke(path2d);
        }
    }

    private fillRule(): CanvasFillRule {
        switch (this.fill_rule) {
            case 'evenodd':
                return 'evenodd';
            case 'nonzero':
            default:
                return 'nonzero';
        }
    }
}

class TypstGroup extends Renderable {
    children: Renderable[] = [];
    transform?: string;
    
    addChild(child: Renderable) {
        this.children.push(child);
    }

    fromElement(group: Element) {
        this.transform = group.raw.getAttribute('transform') || undefined;

        for (let i = 0; i < group.children.length; i++) {
            const child = group.children[i];
            if (child.isPath()) {
                const path = new TypstPath();
                path.fromElement(child);
                this.children.push(path);
            } else if (child.isUse()) {
                const use = new TypstUse();
                use.fromElement(child);
                this.children.push(use);
            } else if (child.isGroup()) {
                const group = new TypstGroup();
                group.fromElement(child);
                this.children.push(group);
            }
        }
    }

    render(ctx: SuitableCanvasContext, glyphs: Map<string, Path2D>): void {
        if (this.transform) {
            ctx.save();
            if (this.transform) {
                if (this.transform.startsWith('translate')) {
                    const [x, y] = this.transform.match(/[-+]?[0-9]*\.?[0-9]+/g)!.map(parseFloat); // transform="translate(10.82743, 20.923764)"
                    // console.log("Translating", x, y);
                    
                    ctx.translate(x, y);
                } else if (this.transform.startsWith('rotate')) {
                    const [angle, cx, cy] = this.transform.match(/[-+]?[0-9]*\.?[0-9]+/g)!.map(parseFloat);
                    ctx.translate(cx, cy);
                    ctx.rotate(angle * Math.PI / 180);
                    ctx.translate(-cx, -cy);
                } else if (this.transform.startsWith('scale')) {
                    const [x, y] = this.transform.match(/[-+]?[0-9]*\.?[0-9]+/g)!.map(parseFloat);
                    ctx.scale(x, y);
                }
            }
        }

        for (let i = 0; i < this.children.length; i++) {
            this.children[i].render(ctx, glyphs);
        }

        if (this.transform) {
            ctx.restore();
        }
    }
}

class Element {
    private element: XMLElement;
    children: Element[] = [];

    constructor(element: XMLElement) {
        this.element = element;
        this.children = this.element.childNodes.filter((node) => node.nodeType === node.ELEMENT_NODE).map((node) => new Element(node as XMLElement));
    }

    get raw() {
        return this.element;
    }

    isGroup() {
        return this.element.tagName === 'g';
    }

    isPath() {
        return this.element.tagName === 'path';
    }

    isUse() {
        return this.element.tagName === 'use';
    }
}



/* export class TypstToCanvas {
    private canvas: SuitableCanvas;
    private maxWidth?: number;
    private domParser: XMLDOMParser;
    private contextScale: number = 1;
    private maxWidthScale: number = 1;
    private blankContext: boolean = true;
    private viewbox: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 0, height: 0 };
    private ctx: SuitableCanvasContext | null = null;
    private needRender: boolean = false;

    private glyphs: Map<string, Path2D> = new Map();

    private root: TypstGroup = new TypstGroup();

    constructor(canvas: SuitableCanvas, maxWidth?: number) {
        this.canvas = canvas;
        this.domParser = new XMLDOMParser();
        this.maxWidth = maxWidth;
        this.ctx = this.canvas.getContext('2d') as SuitableCanvasContext | null;

        if (!this.ctx) return; 

        this.rawRender(this.ctx);
    }

    renderSVG(svg: string) {
        const doc = this.domParser.parseFromString(svg, 'image/svg+xml');

        if (!this.ctx) return;

        const hasSvgElement = doc.getElementsByTagName('svg')[0];
        const viewBox = hasSvgElement?.getAttribute('viewBox');

        if (viewBox) {
            const [x, y, width, height] = viewBox.split(' ').map(parseFloat);

            this.viewbox = { x, y, width, height };

            if (this.maxWidth) {
                this.rawSetNewMaxWidth(this.maxWidth);
            }
        }

        this.glyphs.clear();

        const hasDefs = doc.getElementById('glyph');
        if (hasDefs) {
            const defs = new Element(hasDefs);
            for (const child of defs.children) {
                const path = child.children.at(0);
                if (path) {
                    const d = path.raw.getAttribute('d');
                    this.glyphs.set(child.raw.getAttribute('id')!, new Path2D(d!));
                }
            }
            defs.raw.parentNode?.removeChild(hasDefs);
        }


        if (hasSvgElement) {
            const svgElement = new Element(hasSvgElement);
            for (let i = 0; i < svgElement.children.length; i++) {
                const child = svgElement.children[i];
                
                if (child.isGroup()) {
                    const group = new TypstGroup();
                    group.fromElement(child);
                    
                    this.root.addChild(group);
                } else if (child.isPath()) {
                    const path = new TypstPath();
                    path.fromElement(child);
                    
                    this.root.addChild(path);
                }
            }

            this.needRender = true;
        }
    }

    private scaleToMaxWidth(): { width: number, height: number; amount: number } | undefined {
        if (!this.maxWidth) return;

        const { width, height } = this.viewbox;
        const ratio = this.maxWidth / width;

        this.maxWidthScale = ratio;

        return { width: width * ratio, height: height * ratio, amount: ratio };
    }

    private scaleDimensionByFactor({ width, height }: { width: number, height: number }, factor: number): { width: number, height: number, amount: number } {
        return { width: width * factor, height: height * factor, amount: factor };
    }

    get dimension() {
        return { width: this.canvas.width, height: this.canvas.height };
    }

    setNewMaxWidth(maxWidth: number) {
        if (!this.ctx) return;

        this.rawSetNewMaxWidth(maxWidth);
    }

    private rawSetNewMaxWidth(maxWidth: number) {
        
        // if (!this.changedMaxWidth) return
        this.maxWidth = maxWidth;
        
        const oldMaxWidthScale = this.maxWidthScale;
        const scaled = this.scaleToMaxWidth()!;
        this.contextScale = (this.contextScale / oldMaxWidthScale) * scaled.amount;

        const { width, height } = this.scaleDimensionByFactor(this.viewbox, this.contextScale);
        if (this.canvas.width === (width | 0) && this.canvas.height === (height | 0)) return;
        this.canvas.width = width;
        this.canvas.height = height;
        this.blankContext = true;
    }

    scale(factor: number) {
        if (!this.ctx) return;

        this.contextScale = this.maxWidthScale * factor;

        const { width, height } = this.scaleDimensionByFactor(this.viewbox, this.contextScale);
        this.canvas.width = width;
        this.canvas.height = height;
        this.blankContext = true;
        
        this.needRender = true;
    }

    private rawScaledRender(factor: number, ctx: SuitableCanvasContext) {
        const startTime = performance.now();
        let ctxClear = null;
        if (this.blankContext) {
            ctx.scale(factor, factor);
            // Fill with white
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            ctxClear = performance.now();
            console.log("Scaling", factor);
            this.blankContext = false;
        }
        this.root.render(ctx, this.glyphs);
        const endTime = performance.now();
        console.log("Rendering took", endTime - startTime, "ms", ctxClear ? `(${endTime - ctxClear}ms)` : '');
    }

    private async hasPageUpdate() {
        return new Promise<void>((resolve) => {
            const interval = setInterval(() => {
                if (this.needRender) {
                    this.needRender = false;
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    private async rawRender(ctx: SuitableCanvasContext) {
        this.rawScaledRender(this.contextScale, ctx);
        await this.hasPageUpdate();
        requestAnimationFrame(() => this.rawRender(ctx));
    }

    getBlob(): Promise<Blob> {
            return new Promise((resolve) => {
                if (this.canvas instanceof HTMLCanvasElement) {
                    this.canvas.toBlob((blob) => {
                        resolve(blob!);
                    });
                } else {
                    this.canvas.convertToBlob().then((blob) => {
                        resolve(blob!);
                    });
                }
            });
    }
} */

export class TypstToCanvas {
    private canvas: SuitableCanvas;
    private maxWidth: number;
    private domParser: XMLDOMParser;
    private ctx: SuitableCanvasContext | null = null;

    render(svg: string) {
        this.rawRender(svg);
    }

    private rawRender(svg: string) {

    }
}