<script lang="ts">
	import { getDebugStore } from "@/lib/backend/stores/debug.svelte";
	import { getUiStore } from "@/lib/backend/stores/ui.svelte";
	import { createId } from "@paralleldrive/cuid2";
	import { ChevronRight } from "lucide-svelte";
	import { untrack } from "svelte";
    
    interface DebugError {
        id: string;
        severity: "error" | "warning" | "info";
        message: string;
        details?: string;
    }

    const uiStore = getUiStore();
    const debugStore = getDebugStore();
    
    let filterType = $state("all");

    let errors: DebugError[] = $state([]);

    $effect(() => {
        untrack(() => errors = []);
        if (debugStore.compileError) {
            console.log("Compile error:", $state.snapshot(debugStore.compileError));
            let err = debugStore.compileError;

            if ("CompileError" in err) {
                for (const error of err.CompileError) {
                    untrack(() => errors.push({
                        id: createId(),
                        severity: (error.severity as unknown) === "Error" ? "error" : (error.severity as unknown) === "Warning" ? "warning" : "info",
                        message: error.message,
                        details: `on file ${error.range.path} at ${error.range.start}:${error.range.end}`,
                    }));
                }
            } else if ("DefaultError" in err) {
                untrack(() => errors.push({
                    id: createId(),
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
            <div class="flex gap-2" role="radiogroup">
                <input class="btn btn-sm btn-accent not-checked:btn-soft" type="radio" bind:group={filterType}  value="all" aria-label="All" />
                <input class="btn btn-sm btn-warning not-checked:btn-soft" type="radio" bind:group={filterType} value="warning" aria-label="Warnings" />
                <input class="btn btn-sm btn-error not-checked:btn-soft" type="radio" bind:group={filterType} value="error" aria-label="Errors" />
            </div>
        </div>
        <div class="flex flex-col gap-2 bg-base-300 h-full w-full px-1 pt-1 rounded-t overflow-y-auto">
            {#each errors.filter((value) => filterType === "all" || value.severity === filterType) as error (error.id)}
                {@const colorTrailer = error.severity === "error" ? "-error" : error.severity === "warning" ? "-warning" : "-info"}
                {#if error.details}
                    <details class="collapse group">
                        <summary class="collapse-title p-2 min-h-8 hover:brightness-90">
                            <div class="flex gap-2 items-center">
                                <ChevronRight class="w-4 h-4 transition-transform duration-200 group-open:rotate-90 {'text' + colorTrailer}" />
                                <p class="font-mono">{error.message}</p>
                            </div>
                        </summary>
                        <div class="collapse-content text-sm px-2 pb-2 relative">
                            <div class="absolute top-0 left-4 w-0.5 h-full {'bg' + colorTrailer} transform -translate-x-1/2 -translate-y-2"></div>
                            <div class="absolute bottom-2 left-4 w-2 h-0.5 {'bg' + colorTrailer}"></div>
                            <p class="text-gray-400 font-mono pl-5">{error.details}</p>
                        </div>
                    </details>
                {:else}
                    <div class="flex gap-2 items-center">
                        <div class="w-2 h-2 rounded-full {'bg' + colorTrailer}"></div>
                        <p class="font-mono">{error.message}</p>
                    </div>
                {/if}
            {/each}
        </div>
    </div>
{/if}
