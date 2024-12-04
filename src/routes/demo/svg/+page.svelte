<script lang="ts">
    import svg from '$lib/assets/testsvg.svg?raw';
	import { TypstToCanvas } from '$lib/ttc';

    let canvas: HTMLCanvasElement;
    let dimensions = { width: 0, height: 0 };
    let zoom = 1;
    let ttc: TypstToCanvas;
    // let svg;

    $effect(() => {
        ttc = new TypstToCanvas(canvas, 833);

        ttc.renderSVG(svg);

        dimensions = { width: canvas.width, height: canvas.height };
    });
</script>

<div class="absolute top-10 right-10 flex gap-10">
    <button class="px-5 py-2 bg-accent" onclick={() => {
        zoom += 0.1;
        canvas.width = dimensions.width * zoom;
        canvas.height = dimensions.height * zoom;
        ttc.scale(zoom);
    }}>+</button>
    <button class="px-5 py-2 bg-accent" onclick={() => {
        zoom -= 0.1;
        canvas.width = dimensions.width * zoom;
        canvas.height = dimensions.height * zoom;
        ttc.scale(zoom);
    }}>-</button>
</div>

<div class="flex">
    <canvas bind:this={canvas}></canvas>
</div>

<div>
    <p>{svg}</p>
</div>