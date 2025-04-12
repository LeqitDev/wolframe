<script lang="ts">
	import type { FlashMessage } from "$lib/backend/stores/flash.svelte";
	import { fade } from "svelte/transition";
    import { elasticOut } from "svelte/easing";

    let {
        flash,
        remove
    }: {
        flash: FlashMessage
        remove: () => void
    } = $props();

    let remainingTime = $state(flash.duration); // default to 5 seconds if not provided
    let pauseTimer = false; // flag to pause the timer
    const timerDelay = 10;
    let interval: number | null = null; // interval variable

    $effect(() => {
        // start timer with pause
        if (!flash.duration) return; // skip if no duration is set
        interval = setInterval(() => {
            if (pauseTimer) return; // skip if paused
            if (remainingTime! > 0) {
                remainingTime! -= timerDelay; // decrement by 100ms
            } else {
                deleteFlash(); // delete flash when time is up
            }
        }, timerDelay);

        return () => {
            if (interval) {
                clearInterval(interval); // clear interval on component destroy
            }
        }
    });

    function deleteFlash() {
        if (interval) {
            clearInterval(interval); // clear interval if set
        }
        remove(); // remove flash message
    }

    function toast(node: HTMLElement, params: { delay?: number, duration?: number, easing?: (t: number) => number }, context: any) {
        return {
            delay: params.delay || 0,
            duration: params.duration || 250,
            easing: params.easing || elasticOut,
            css: (t: number, u: number) => {
                return `opacity: ${t}; scale: ${0.9 + 0.1 * t};`;
            },
        }
    }

</script>

<div transition:toast class="alert alert-veritcal {flash.type === "error" ? "alert-error" : ""} alert-soft min-w-sm relative" role="alert" onmouseenter={() => {pauseTimer = true}} onmouseleave={() => {pauseTimer = false}}>
    {#if flash.type === "success"}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-success" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    {:else if flash.type === "info"}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-info h-6 w-6 shrink-0">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
    {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-error" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    {/if}
    <span>{flash.message}</span>
    <div>
        <button class="btn btn-square btn-ghost btn-xs" onclick={deleteFlash}>
            ✕
        </button>
    </div>
    {#if flash.duration}
        <progress class="absolute progress h-1 bottom-0 left-0 w-full rounded-t-none rounded-b-full" value={(remainingTime! / flash.duration) * 100} max="100"></progress>
    {/if}
</div>