<script lang="ts">
	import { setEditorManager } from "$lib/backend/stores/editor.svelte";
	import { Pane, Splitpanes } from "svelte-splitpanes";

    let { children } = $props();

    const editorManager = setEditorManager();
    const awaitLoad = editorManager.loadEditor; // https://github.com/sveltejs/svelte/discussions/14692
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
                <ul class="menu menu-horizontal bg-base-200 rounded-box m-2">
                    <li>
                        <details class="outside-close">
                            <summary class="after:hidden py-1">File</summary>
                            <ul class="bg-base-200 mt-0! w-44">
                                <li><a href="/">New File</a></li>
                                <li><a href="/">Open File</a></li>
                                <li><a href="/">Save</a></li>
                                <li><a href="/">Save As</a></li>
                                <li><a href="/">Close File</a></li>
                                <li><a href="/">Export File</a></li>
                            </ul>
                        </details>
                    </li>
                    <li>
                        <details class="outside-close">
                            <summary class="after:hidden py-1">Project</summary>
                            <ul class="bg-base-200 mt-0! w-44">
                                <li><a href="/">Export Project</a></li>
                                <li><a href="/">Show Console</a></li>
                            </ul>
                        </details>
                    </li>
                    <li>
                        <details class="outside-close">
                            <summary class="after:hidden py-1">Preview</summary>
                            <ul class="bg-base-200 mt-0! w-44">
                                <li><a href="/">Hide Preview</a></li>
                                <li><a href="/">Refresh Preview</a></li>
                                <li><a href="/">Preview in New Window</a></li>
                                <li><a href="/">Zoom In</a></li>
                                <li><a href="/">Zoom Out</a></li>
                                <li><a href="/">Set Zoom</a></li>
                            </ul>
                        </details>
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
                    <Pane snapSize={10}>
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