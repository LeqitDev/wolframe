<script lang="ts">
	import { createId } from "@paralleldrive/cuid2";
	import { X } from "lucide-svelte";
	import { untrack } from "svelte";
import type { ChangeEvent } from "sveltekit-superforms";

    let {
        value = $bindable(),
        completions = [],
        useCompletions = false,
    }: {
        value?: string;
        completions?: string[];
        useCompletions?: boolean;
    } = $props();

    let isCompletionsOpen = $state(false);
    let input: HTMLInputElement;
    let tags: {id: string, name: string}[] = $state([]);
    let inputValue: string = $state("");
    let completionIndex: number = $state(0);

    function pushTag(tag: string) {
        if (tag && tag !== "") {
            tags.push({ id: createId(), name: tag });
        }
    }

    function removeTag(id: string) {
        const index = tags.findIndex((tag) => tag.id === id);
        if (index !== -1) {
            tags.splice(index, 1);
        }
    }

    $effect(() => {
        untrack(() => {
            if (value) {
                value.split(' ').filter((tag) => tag !== "").forEach((tag) => {
                    pushTag(tag);
                })
            }
        })
    })

    $effect(() => {
        value = tags.map((value) => value.name).join(' ') + (inputValue && inputValue.length > 0 ? ' ' + inputValue : '');
    })

    function openCompletions() {
        if (useCompletions && !isCompletionsOpen) {
            isCompletionsOpen = true;
        }
    }

    function closeCompletions() {
        isCompletionsOpen = false;
    }

    function filterAutocomplete() {
        const lastTag = (inputValue ?? "").split(' ').pop();
        const array = completions.filter((item) => item.includes(lastTag!)).map((item) => {
            return {html: "<span>" + item.replace(lastTag!, `<span class="text-primary font-semibold">${lastTag!}</span>`) + "</span>", item: item};
        });
        return array;
    }

    function getTags() {
        const tags = (inputValue ?? "").split(' ');
        return tags.filter((tag, index) => tag !== "" && index !== tags.length - 1);
    }

    function onInput(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            const tag = (inputValue ?? "").split(' ')[0];
            if (tag && tag !== "") {
                pushTag(tag);
                inputValue = '';
            }
        } else if (event.key === " ") {
            event.preventDefault();
            const tag = (inputValue ?? "").split(' ')[0];
            if (tag && tag !== "") {
                pushTag(tag);
                inputValue = '';
            }
        } else if (event.key === "Backspace") {
            if (inputValue === "") {
                closeCompletions();
                const tag = tags.pop();
                inputValue = tag?.name ?? "";
            } else if (inputValue.length === 1) {
                closeCompletions();
            }
        } else if (event.key === "Escape") {
            closeCompletions();
        } else if (event.key === "Tab") {
            event.preventDefault();
            const filteredCompletions = filterAutocomplete();
            if (filteredCompletions.length > 0) {
                pushTag(filteredCompletions[completionIndex % filteredCompletions.length].item);
                inputValue = '';
                closeCompletions();
            }
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            const filteredCompletions = filterAutocomplete();
            if (filteredCompletions.length > 0) {
                completionIndex = (completionIndex + 1) % filteredCompletions.length;
            }
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            const filteredCompletions = filterAutocomplete();
            if (filteredCompletions.length > 0) {
                completionIndex = (completionIndex - 1 + filteredCompletions.length) % filteredCompletions.length;
            }
        } else {
            const filteredCompletions = filterAutocomplete();
            if (filteredCompletions.length > 0) {
                completionIndex = (completionIndex) % filteredCompletions.length;
            }
            openCompletions();
        }
    }
</script>

<details class="dropdown w-min" bind:open={isCompletionsOpen}>
	<summary class="marker:[content: ''] w-xs list-none marker:hidden" onclick={(e) => e.preventDefault()}>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div role="textbox" tabindex="0" class="flex items-center w-md max-w-md h-auto min-h-10 input border flex-wrap gap-0 py-1" onclick={() => input.focus()}>
            {#each tags as tag}
                <div class="tag badge badge-primary mr-1.5 my-1 px-2">{tag.name}<button onclick={(e) => {e.preventDefault(); e.stopPropagation(); removeTag(tag.id)}} class="cursor-pointer rounded-full hover:backdrop-brightness-50 hover:filter"><X class="size-4" /></button></div>
            {/each}
            <input
                type="text"
                class="min-w-8 min-h-8 w-auto"
                bind:this={input}
                bind:value={inputValue}
                onkeydown={onInput}
                onblur={closeCompletions}
            />
        </div>
	</summary>
	<ul
		class="dropdown-content menu bg-base-300 rounded-box z-1 max-h-40 w-md flex-nowrap overflow-auto p-2 shadow-sm"
	>
		{#each filterAutocomplete() as item, i}
			<li><button  class={[i === completionIndex ? "menu-active" : ""]} onclick={() => {
                pushTag(item.item);
                inputValue = '';
                closeCompletions();
            }}>{@html item.html}</button></li>
		{/each}
	</ul>
</details>