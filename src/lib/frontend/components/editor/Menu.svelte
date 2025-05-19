<script lang="ts">
	import eventController from "@/lib/backend/events";
	import DropdownMenuItem from "../DropdownMenuItem.svelte";
	import { getUiStore } from "@/lib/backend/stores/ui.svelte";

    const uiStore = getUiStore();
    let showConsole = $state(true);
</script>

<ul class="menu menu-horizontal bg-base-200 h-12 w-full gap-2 p-2">
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
                <button onclick={() => {
                    uiStore.setDebugPanelSize(100 - (uiStore.isDebugPanelMinimized ? 30 : 0));
                }}>
                    {uiStore.isDebugPanelMinimized ? 'Show' : 'Hide'} Console
                </button>
            </li>
        </DropdownMenuItem>
    </li>
    <li>
        <DropdownMenuItem name="Preview">
            <li><button onclick={() => {
                uiStore.showPreview();
            }}>Hide Preview</button></li>
            <li><a href="/">Refresh Preview</a></li>
            <li><a href="/">Preview in New Window</a></li>
            <li><a href="/">Zoom In</a></li>
            <li><a href="/">Zoom Out</a></li>
            <li><a href="/">Set Zoom</a></li>
        </DropdownMenuItem>
    </li>
</ul>