<script lang="ts">
	import { getDebugStore } from "@/lib/backend/stores/debug.svelte";
	import { getUiStore } from "@/lib/backend/stores/ui.svelte";
	import { untrack } from "svelte";
    
    interface DebugError {
        severity: "error" | "warning" | "info";
        message: string;
    }

    const uiStore = getUiStore();
    const debugStore = getDebugStore();

    let errors: DebugError[] = $state([]);

    $effect(() => {
        untrack(() => errors = []);
        if (debugStore.compileError) {
            let err = debugStore.compileError;

            if ("CompileError" in err) {
                for (const error of err.CompileError) {
                    untrack(() => errors.push({
                        severity: error.severity,
                        message: error.message,
                    }));
                }
            } else if ("DefaultError" in err) {
                untrack(() => errors.push({
                    severity: "error",
                    message: err.DefaultError,
                }));
            }
        }
    })
</script>

{#if uiStore.isDebugPanelMinimized}
    <button class="flex w-full gap-2 px-2 items-center" onclick={() => (uiStore.setDebugPanelSize?.(100 - 30))}>
        <p class="text-sm text-gray-400">Compile Errors: <span class="p-0.5 text-error/80 font-bold">{errors.length}</span></p>
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
            {#each errors as error}
                <div class="flex gap-2 items-center">
                    <div class="w-2 h-2 rounded-full {error.severity === 'error' ? 'bg-error' : error.severity === 'warning' ? 'bg-warning' : 'bg-info'}"></div>
                    <p class="text-sm text-gray-400">{error.message}</p>
                </div>
            {/each}
        </div>
    </div>
{/if}
