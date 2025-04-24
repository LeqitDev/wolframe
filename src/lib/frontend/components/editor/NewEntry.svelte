<script lang="ts">
	import { Path } from "@/lib/backend/path";
	import { getVirtualFileSystem } from "@/lib/backend/stores/vfs.svelte";
	import type { TreeNode } from "@/lib/backend/stores/vfs/TreeNode.svelte";
	import { FolderClosed, File } from "lucide-svelte";

    let {
        entry,
    }: {
        entry: TreeNode;
    } = $props();

    const vfs = getVirtualFileSystem();

	function finalizeNewFile(el: HTMLInputElement, entry: TreeNode) {
		const name = el.value;
		if (name === '') {
			vfs.removeFile(entry.file.id);
			return;
		}
		try {
			const path = new Path(name).rootless();
			const parts = path.split('/');
			const old_entry = entry;
			entry = entry.parent!;
			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				if (i === parts.length - 1) {
					const result = vfs.addFile(part, old_entry.isFile ? '' : null, entry.file.id);
					if (result.ok) {
						const result = vfs.removeFile(old_entry.file.id);
						if (!result.ok) {
							console.error(result.error);
						}
					} else {
						old_entry.error = result.error.message;
					}
				} else {
					const result = vfs.addFile(part, null, entry.file.id);
					if (result.ok) {
						entry = result.value;
						entry.open = true;
					}
				}
			}
		} catch (e) {
			console.error(e);
			return;
		}
	}

	function finalizeRenaming(el: HTMLInputElement, entry: TreeNode) {
		const name = el.value;
		if (name === '') {
			entry.renaming = false;
			entry.input = false;
			return;
		}

		try {
			const path = new Path(name).rootless();
			const parts = path.split('/');

			if (parts.length > 1) return;

			vfs.renameFile(entry.file.id, name);
			entry.renaming = false;
			entry.input = false;
		} catch (e) {
			console.error(e);
			return;
		}
	}

    function onNewEntryBlurEvent(e: FocusEvent, entry: TreeNode) {
		if (entry.renaming) {
			finalizeRenaming(e.target as HTMLInputElement, entry);
		} else {
			finalizeNewFile(e.target as HTMLInputElement, entry);
		}
	}

	function onNewEntryKeydownEvent(e: KeyboardEvent, entry: TreeNode) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (entry.renaming) {
				finalizeRenaming(e.target as HTMLInputElement, entry);
			} else {
				finalizeNewFile(e.target as HTMLInputElement, entry);
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			if (entry.renaming) {
				entry.renaming = false;
				entry.input = false;
			} else {
				vfs.removeFile(entry.file.id);
			}
		}
	}

	function onNewEntryInputEvent(e: Event, entry: TreeNode) {
		const el = e.target as HTMLInputElement;

		if (entry.parent?.hasChild(el.value)) {
			entry.error = `File or folder with name '${el.value}' already exists at this location. Please choose a different name.`;
		} else {
			entry.error = null;
		}
	}
</script>
<button class="relative">
	{#if entry.isFile}
	<File class={`h-4 w-4 ${entry.error ? 'text-error-content z-20' : ''}`} strokeWidth="2" />
	{:else}
    <FolderClosed
        class={`h-4 w-4 ${entry.error ? 'text-error-content z-20' : ''}`}
        strokeWidth="2"
    />
	{/if}
    <input
        type="text"
        class={['input input-xs', entry.error ? 'z-20' : '']}
        value={entry.file.name}
        id="newFileInput"
        oninput={(e) => {
            onNewEntryInputEvent(e, entry);
        }}
        onblur={(e) => {
            onNewEntryBlurEvent(e, entry);
        }}
        onkeydown={(e) => {
            onNewEntryKeydownEvent(e, entry);
        }}
    />
    {#if entry.error}
        <div
            class="bg-error rounded-t-box absolute top-0 right-0 bottom-0 left-0 transform p-2"
        ></div>
        <div
            class="bg-error rounded-b-box absolute right-0 bottom-0 left-0 z-10 translate-y-full transform p-2"
        >
            <p class="text-error-content text-xs text-wrap">{entry.error}</p>
        </div>
    {/if}
</button>