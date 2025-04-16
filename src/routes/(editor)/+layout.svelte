<script lang="ts">
	import { setEditorManager } from "$lib/backend/stores/editor.svelte";
	import DropdownMenuItem from "@/lib/frontend/components/DropdownMenuItem.svelte";
	import { Pane, Splitpanes } from "svelte-splitpanes";

    let { children } = $props();

    const editorManager = setEditorManager();
    const awaitLoad = editorManager.loadEditor; // https://github.com/sveltejs/svelte/discussions/14692
    let showConsole = $state(0);
    let detailsElement: HTMLDetailsElement;
</script>

{#await awaitLoad}
    <p>{editorManager.loading.message}</p>
{:then}
    <div class="w-screen h-screen flex">
        <Splitpanes theme="wolframe-theme">
            <Pane size={18} snapSize={8} maxSize={70}>
                <p>File Explorer</p>
            </Pane>
            <Pane class="border-l border-primary/50">
                <ul class="menu menu-horizontal bg-base-100 rounded-box m-2">
                    <li>
                        <DropdownMenuItem name="File">
                            <li><a href="/">New File</a></li>
                            <li><a href="/">Open File</a></li>
                            <li><a href="/">Save</a></li>
                            <li><a href="/">Save As</a></li>
                            <li><a href="/">Close File</a></li>
                            <li><a href="/">Export File</a></li>
                        </DropdownMenuItem>
                    </li>
                    <li>
                        <DropdownMenuItem name="Edit">
                            <li><a href="/">Undo</a></li>
                            <li><a href="/">Redo</a></li>
                            <li><a href="/">Cut</a></li>
                            <li><a href="/">Copy</a></li>
                            <li><a href="/">Paste</a></li>
                            <li><a href="/">Select All</a></li>
                        </DropdownMenuItem>
                    </li>
                    <li>
                        <DropdownMenuItem name="Project">
                            <li><a href="/">Export Project</a></li>
                                <li>
                                    <button 
                                        onclick={() => showConsole = showConsole === 0 ? 20 : 0}
                                    >
                                        {showConsole === 0 ? 'Show' : 'Hide'} Console
                                    </button>
                                </li>
                        </DropdownMenuItem>
                    </li>
                    <li>
                        <DropdownMenuItem name="Preview">
                            <li><a href="/">Hide Preview</a></li>
                            <li><a href="/">Refresh Preview</a></li>
                            <li><a href="/">Preview in New Window</a></li>
                            <li><a href="/">Zoom In</a></li>
                            <li><a href="/">Zoom Out</a></li>
                            <li><a href="/">Set Zoom</a></li>
                        </DropdownMenuItem>
                    </li>
                </ul>
                <Splitpanes horizontal theme="wolframe-theme">
                    <Pane size={100} minSize={10} class="border-b border-primary/50">
                        <Splitpanes theme="wolframe-theme">
                            <Pane size={50} minSize={20} maxSize={80} class="border-r border-primary/50">
                                <p>Editor</p>
                            </Pane>
                            <Pane>
                                <p>Preview</p>
                            </Pane>
                        </Splitpanes>
                    </Pane>
                    <Pane snapSize={10} bind:size={showConsole}>
                        <p>Console</p>
                    </Pane>
                </Splitpanes>
            </Pane>
        </Splitpanes>
    </div>
{:catch e}
    <p>{e}</p>
{/await}

{@render children()}