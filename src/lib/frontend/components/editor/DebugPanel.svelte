<script lang="ts">
	import { getUiStore } from "@/lib/backend/stores/ui.svelte";
	import { fade } from "svelte/transition";

    const uiStore = getUiStore();
</script>

{#if uiStore.debugPanelState === 'minimized'}
    <button class="flex w-full gap-2 px-2" on:click={() => uiStore.expandDebugPanel()}>
        <p class="text-sm text-gray-400">Compile Errors: <span class="p-0.5 text-error/80 font-bold">0</span></p>
    </button>
{:else}
    <div class="flex w-full h-full flex-col gap-2 px-2 pt-2">
        <div class="flex w-full items-center justify-between">
            <h2 class="font-bold">Compile output</h2>
            <div class="flex gap-2">
                <input class="btn btn-sm btn-accent not-checked:btn-soft" type="radio" name="filter" value="all" aria-label="All" checked />
                <input class="btn btn-sm btn-warning not-checked:btn-soft" type="radio" name="filter" value="warnings" aria-label="Warnings" />
                <input class="btn btn-sm btn-error not-checked:btn-soft" type="radio" name="filter" value="errors" aria-label="Errors" />
            </div>
        </div>
        <div class="flex flex-col gap-2 bg-base-300 h-full w-full px-2 rounded-t">
            hihi
        </div>
    </div>
{/if}
