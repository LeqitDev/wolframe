<script lang="ts">
	import Calendar from 'lucide-svelte/icons/calendar';
	import House from 'lucide-svelte/icons/house';
	import Inbox from 'lucide-svelte/icons/inbox';
	import Search from 'lucide-svelte/icons/search';
	import Settings from 'lucide-svelte/icons/settings';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import File from 'lucide-svelte/icons/file';
	import Folder from 'lucide-svelte/icons/folder';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import { createAvatar } from '@dicebear/core';
	import { initials } from '@dicebear/collection';
	import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
	import Separator from './ui/separator/separator.svelte';
	import { Input } from './ui/input';
	import { tick, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { flip } from 'svelte/animate';
	import { getController } from '$lib/stores/controller.svelte';
	import type { VFSEntry } from '$lib/stores/vfs.svelte';

	function isFolder (node: SidebarNode): node is SidebarFolder {
		return (node as SidebarFolder).isFolder;
	}

	class HoverQueue {
		queue: { item: SidebarNode; isDir: boolean }[] = $state([]);
		freezedHovered: null | { item: SidebarNode; isDir: boolean } = $state(null);

		add(item: SidebarNode, isDir: boolean) {
			this.queue.push({ item, isDir });
		}

		remove(item: SidebarNode) {
			this.queue = this.queue.filter((i) => i.item !== item);
		}

		get hovered() {
			return this.queue[this.queue.length - 1];
		}

		staticHovered() {
			return untrack(() => {
				this.freezedHovered = this.queue[this.queue.length - 1];
				return this.freezedHovered;
			});
		}
	}

	// https://github.com/Microsoft/monaco-editor/issues/366

	// Menu items.
	const items = [
		{
			title: 'Project Settings',
			url: '#',
			icon: Settings
		},
		{
			title: 'Home',
			url: '/',
			icon: House
		}
	];

	const controller = getController();

	type SidebarFolder = App.VFS.Sidebar.Folder;
	type SidebarFile = App.VFS.Sidebar.File;
	type SidebarNode = App.VFS.Sidebar.Node;

	let data: { tree?: SidebarFolder, root?: string, name?: string } = $state({});

	let dragState: {
		dragged: SidebarNode | null;
		targets: SvelteSet<SidebarFolder>;
		hoverTimer: number;
	} = $state({
		dragged: null,
		targets: new SvelteSet(),
		hoverTimer: 0
	});

	let dragTarget = $derived.by(() => {
		// highest depth folder in dragState.targets
		let maxDepth = -1;
		let target: SidebarFolder | null = null;
		let targets = dragState.targets;

		if (dragState.targets.size === 0) return null;
		for (const folder of targets) {
			if (folder.depth > maxDepth) {
				maxDepth = folder.depth;
				target = folder;
			}
		}

		return target;
	});

	let validDrop = $derived.by(() => {
		return dragState.dragged && dragTarget && validateDragTarget(dragState.dragged, dragTarget);
	});

	function validateDragTarget(dragged: SidebarNode, target: SidebarNode): boolean {
		// Prevent dragging into own children or self
		return !(dragged.path === target.path && isFolder(dragged) === isFolder(target));
	}

	let projectAvatar = createAvatar(initials, {
		seed: 'Playground', //Dynamic
		radius: 5
	}).toDataUri();

	$effect(() => {
		if (dragTarget) {
			forEachTreeNode;
		}
	});

	let hoverQueue = new HoverQueue();
	let reloadedStaticHovered = $state(true);
	let contextMenuVisibility = $state(false);
	/* let currentHovered: null | { item: App.VFS.Sidebar.FileSystemNode; isDir: boolean } = $state(null);
	let staticHovered: null | { item: App.VFS.Sidebar.FileSystemNode; isDir: boolean } = $state(null); */

	/* $effect(() => {
		if (!contextMenuVisibility) {
			staticHovered = currentHovered;
		}
	}); */

	function fileSystemFileToFileMetadata(file: App.VFS.Sidebar.FileSystemFile): App.VFS.Sidebar.FileMetadata {
		return {
			filename: file.name,
			mimetype: file.mimetype,
			size: file.size,
			lastModified: file.lastModified,
			etag: file.etag,
			path: file.path
		};
	}

	function getFilename(entry: VFSEntry | SidebarFolder): string {
		return entry.path.split('/').pop() || '';
	}

	function parseVFS(): SidebarFolder {
		const root: SidebarFolder = {
			name: '/',
			isFolder: true,
			children: [],
			depth: 0,
			open: true,
			path: controller.root
		};

		const entries = controller.vfs.entries;
		const filesByDirectory: Map<string, VFSEntry[]> = new Map();
		entries.forEach((file) => {
			const dirPath = file.path.split('/').slice(0, -1).join('/');
			if (!filesByDirectory.has(dirPath)) {
				filesByDirectory.set(dirPath, []);
			}
			filesByDirectory.get(dirPath)?.push(file);
		});

		const buildDirectoryTree = (basePath: string, parentNode: SidebarFolder) => {
			if (!parentNode.isFolder) return;

			controller.vfs.entries.filter(
				(f) =>
					f.path.startsWith(basePath) &&
					f.path.split('/').filter((p) => p).length ===
						basePath.split('/').filter((p) => p).length + 1
			).forEach((file) => {
				parentNode.children.push({...file, name: getFilename(file)});
			});

			// Find subdirectories
			const subdirs = new Set(
				controller.vfs.entries
					.filter(
						(f) =>
							f.path.startsWith(basePath) &&
							f.path !== basePath &&
							f.path.split('/').filter((p) => p).length >
								basePath.split('/').filter((p) => p).length + 1
					)
					.map(
						(f) => f.path.split('/').filter((p) => p)[basePath.split('/').filter((p) => p).length]
					)
			);

			subdirs.forEach((subdir) => {
				const fullSubdirPath = `${basePath}/${subdir}`;
				const dirNode: SidebarFolder = {
					name: getFilename({ path: fullSubdirPath } as VFSEntry),
					isFolder: true,
					depth: parentNode.depth + 1,
					children: [],
					path: fullSubdirPath,
					open: false
				};
				parentNode.children.push(dirNode);
				buildDirectoryTree(fullSubdirPath, dirNode);
			});

			parentNode.children.sort((a, b) => {
				const isADir = isFolder(a);
				const isBDir = isFolder(b);

				if (isADir && !isBDir) return -1;
				if (!isADir && isBDir) return 1;

				return a.path.localeCompare(b.path);
			});
		};

		buildDirectoryTree(controller.root, root);

		return root;
	}

	function parsePageData(data: { files: App.VFS.Sidebar.FileMetadata[]; project_path: string }) {
		const root: App.VFS.Sidebar.FileSystemNode = {
			name: data.project_path.split('/').pop() || '',
			type: 'directory',
			children: [],
			depth: 0,
			open: true,
			path: data.project_path.substring(0, data.project_path.length)
		};

		const filesByDirectory: Map<string, App.VFS.Sidebar.FileMetadata[]> = new Map();
		data.files.forEach((file) => {
			const dirPath = file.path.replace(file.filename, '').trim();
			if (!filesByDirectory.has(dirPath)) {
				filesByDirectory.set(dirPath, []);
			}
			filesByDirectory.get(dirPath)?.push(file);
		});

		const buildDirectoryTree = (basePath: string, parentNode: App.VFS.Sidebar.FileSystemNode) => {
			if (parentNode.type === 'file') return;

			const directFiles = data.files.filter(
				(f) =>
					f.path.startsWith(basePath) &&
					f.path.split('/').filter((p) => p).length ===
						basePath.split('/').filter((p) => p).length + 1
			);

			directFiles.forEach((file) => {
				const fileNode: App.VFS.Sidebar.FileSystemNode = {
					name: file.filename,
					type: 'file',
					size: file.size,
					mimetype: file.mimetype,
					lastModified: file.lastModified,
					etag: file.etag,
					path: file.path
				};
				parentNode.children.push(fileNode);
			});

			// Find subdirectories
			const subdirs = new Set(
				data.files
					.filter(
						(f) =>
							f.path.startsWith(basePath) &&
							f.path !== basePath &&
							f.path.split('/').filter((p) => p).length >
								basePath.split('/').filter((p) => p).length + 1
					)
					.map(
						(f) => f.path.split('/').filter((p) => p)[basePath.split('/').filter((p) => p).length]
					)
			);

			subdirs.forEach((subdir) => {
				const fullSubdirPath = `${basePath}/${subdir}`;
				const dirNode: App.VFS.Sidebar.FileSystemNode = {
					name: subdir,
					type: 'directory',
					depth: parentNode.depth + 1,
					children: [],
					path: fullSubdirPath,
					open: false
				};
				parentNode.children.push(dirNode);
				buildDirectoryTree(fullSubdirPath, dirNode);
			});

			parentNode.children.sort((a, b) => {
				const isADir = a.type === 'directory';
				const isBDir = b.type === 'directory';

				if (isADir && !isBDir) return -1;
				if (!isADir && isBDir) return 1;

				return a.name.localeCompare(b.name);
			});
		};

		buildDirectoryTree(data.project_path, root);

		return root;
	}

	// Function to recursively find and remove the item
	function findAndRemoveItem(tree: SidebarNode, delitem: SidebarNode): SidebarNode | null {
		let removedItem: SidebarNode | null = null;
		
		if (isFolder(tree)) {
			for (let i = 0; i < tree.children.length; i++) {
				const item = tree.children[i];
				

				// If it's a file and matches the path and type, remove it
				if (item.path === delitem.path && isFolder(item) === isFolder(delitem)) {
					return tree.children.splice(i, 1)[0];
				}

				// If it's a directory, recursively search only if the path is a prefix
				if (isFolder(item) && delitem.path.startsWith(item.path)) {
					const removedItem = findAndRemoveItem(item, delitem);
					/* if (item.children.length === 0) { If we want to remove empty dirs
						tree.children.splice(i, 1);
					} */
					if (removedItem) return removedItem;
				}
			}
		}

		return removedItem;
	}

	// Function to insert item into the correct folder
	function insertItemInFolder(tree: SidebarNode, folder: SidebarNode, item: SidebarNode) {
		if (item.path === folder.path) {
			console.error('Cannot insert item into itself');
			return;
		}

		const parts = item.path.replace(tree.path, '').split('/').filter(Boolean);
		let current = tree;

		if (isFolder(current)) {
			for (const part of parts.slice(0, -1)) {
				current = current as SidebarFolder;
				const dir: SidebarNode | undefined = current.children.find(
					(child) => getFilename(child) === part
				);

				if (!dir || !isFolder(dir)) {
					console.error('Directory not found');
					return;
				}

				current = dir;
			}
			current = current as SidebarFolder;

			current.children.push(item);

			// Sort the children
			current.children.sort((a, b) => {
				const isADir = isFolder(a);
				const isBDir = isFolder(b);

				if (isADir && !isBDir) return -1;
				if (!isADir && isBDir) return 1;

				return a.path.localeCompare(b.path);
			});
		}
	}

	function moveItemInTree(
		tree: SidebarNode,
		curFolder: SidebarNode,
		curDragged: SidebarNode
	) {
		// Remove the item from its current location
		const removedItem = findAndRemoveItem(tree, curDragged);

		if (!removedItem) {
			console.error('Item not found in the tree');
			return tree;
		}

		// Update the path of the dragged item
		const newPath = `${curFolder.path}/${getFilename(curDragged)}`;
		const prevPath = removedItem.path;
		
		if (controller.previewFile === prevPath) {
			controller.previewFile = newPath;
		}

		if (controller.activeFile === prevPath) {
			controller.activeFile = newPath;
		}

		removedItem.path = newPath;

		controller.eventListener.fire('sidebarNodeMoved', {node: removedItem, prev_path: prevPath});

		// Insert the item into the new location
		insertItemInFolder(tree, curFolder, removedItem);

		return tree;
	}

	function addFile() {
		let hovered = hoverQueue.freezedHovered;

		if (hovered && hovered.isDir) {
			const newFile = {
				name: '',
				new: true,
				mutated: false,
				open: false,
				content: '',
				path: hovered.item.path + '...'
			} as SidebarFile;

			insertItemInFolder(data.tree!, hovered.item, newFile);
			setTimeout(() => {
				let newFileFocus = document.getElementById('newFileFocus');

				if (newFileFocus) {
					newFileFocus.focus();
				}
			}, 10);
		}
	}

	function finalizeNewFile(e: FocusEvent | KeyboardEvent, item: SidebarNode) {
		if (e.type === 'keypress' && (e as KeyboardEvent).key !== 'Enter' || !item.new) return;
		if (item.name === '') {
			findAndRemoveItem(data.tree!, item);
		} else {
			item.path = item.path.substring(0, item.path.length - 3) + item.name;
			console.log('New file:', $state.snapshot(item));
			
			// TODO: New file callback
			controller.eventListener.fire('sidebarNewFile', {file: item as SidebarFile});
			item.new = false;
		}
	}

	function addDir() {
		let hovered = hoverQueue.freezedHovered;

		if (hovered && hovered.isDir) {
			console.log(hovered.item.path);

			if (!isFolder(hovered.item)) {
				console.error('Cannot create a directory inside a file');
				return;
			}

			const newDir = {
				name: '',
				isFolder: true,
				new: true,
				children: [],
				open: false,
				depth: hovered.item.depth + 1,
				path: hovered.item.path + '/...'
			} as SidebarFolder;
			insertItemInFolder(data.tree!, hovered.item, newDir);

			setTimeout(() => {
				let newDirFocus = document.getElementById('newDirFocus');

				if (newDirFocus) {
					newDirFocus.focus();
				}
			}, 100);
		}
	}

	function finalizeNewDir(e: FocusEvent | KeyboardEvent, item: SidebarNode) {
		if (e.type === 'keypress' && (e as KeyboardEvent).key !== 'Enter') return;
		if (item.name === '') {
			findAndRemoveItem(data.tree!, item);
		} else {
			item.path = item.path.substring(0, item.path.length - 3) + item.name;
			controller.eventListener.fire('sidebarNewDir', {dir: item as SidebarFolder});
			item.new = false;
		}
	}

	function forEachTreeNode(tree: SidebarNode, callback: (node: SidebarNode) => boolean) {
		let terminate = false;
		if (isFolder(tree)) {
			tree.children.forEach((child) => {
				terminate = callback(child);
				if (!terminate) forEachTreeNode(child, callback);
			});
			if (terminate) return;
		}
	}

	function drop(e: DragEvent) {
		e.preventDefault();
		console.log('Drop', $state.snapshot(dragState), $state.snapshot(dragTarget));
		if ($state.snapshot(validDrop)) {
			console.log('OK');

			if (dragState.dragged!.path === dragTarget!.path + '/' + dragState.dragged!.name) {
				dragState.targets.clear();
				return;
			}

			for (const target of dragState.targets) {
				if (!target.open) {
					target.open = true;
				}
			}

			// Move file (inside tree)
			moveItemInTree(data.tree!, dragTarget!, dragState.dragged!);

			// TODO: Move file callback

			dragState.dragged = null;
			dragState.targets.clear();
		}
	}

	function dragEnd(e: DragEvent) {
		dragState.dragged = null;
		dragState.targets.clear();
	}

	function dragStart(e: DragEvent, item: SidebarNode) {
		dragState.dragged = item;
		e.dataTransfer?.setData('text/plain', item.path);
	}

	function dragOverFolder(e: DragEvent, folder: SidebarFolder) {
		e.preventDefault();
		if (dragState.dragged) {
			dragState.targets.add(folder);
		}
	}

	function deleteNode() {
		let hovered = hoverQueue.freezedHovered;

		if (hovered) {
			const item = hovered.item;
			const removedItem = findAndRemoveItem(data.tree!, item);

			if (!isFolder(item)) {
				controller.eventListener.fire('sidebarFileDeleted', {file: removedItem as SidebarFile});
			} else {
				controller.eventListener.fire('sidebarDirDeleted', {dir: removedItem as SidebarFolder});
			}
		}
	}

	$effect(() => {
		data = {
			name: controller.name,
			root: controller.root,
			tree: parseVFS()
		}
	})
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg" class="flex items-center aria-disabled:opacity-100" aria-disabled>
					<img
						src={projectAvatar}
						alt="Avatar"
						class="size-8 rounded-md"
					/>
					<span class="text-lg font-bold"
						>{controller.name}</span
					>
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<ContextMenu.Root
			bind:open={contextMenuVisibility}
			onOpenChange={async () => {
				reloadedStaticHovered = false;
				await tick();
				reloadedStaticHovered = true;
			}}
		>
			<ContextMenu.Trigger class="h-full">
				<Sidebar.Group class="h-full group-data-[collapsible=icon]:hidden">
					<Sidebar.GroupLabel>Project Files</Sidebar.GroupLabel>
					<Sidebar.GroupContent class="h-full">
						<Sidebar.Menu
							onmouseenter={() => {
								hoverQueue.add(data.tree!, true);
							}}
							onmouseleave={() => {
								hoverQueue.remove(data.tree!);
							}}
							ondragover={(e) => dragOverFolder(e, data.tree!)}
							ondrop={drop}
							ondragend={dragEnd}
							class={`h-full gap-0 ${dragTarget?.path === '/' ? 'bg-sidebar-accent' : ''}`}
						>
							{#if data.tree?.children}
								{#each data.tree.children as child, index (index)}
									{@render Tree({ item: child })}
								{/each}
							{/if}
						</Sidebar.Menu>
					</Sidebar.GroupContent>
				</Sidebar.Group>
			</ContextMenu.Trigger>
			<ContextMenu.Content class="w-screen max-w-60 bg-sidebar shadow-xl">
				{#if reloadedStaticHovered}
					{@const cur = hoverQueue.staticHovered()}
					{#if cur}
						{#if cur.isDir}
							<ContextMenu.Item onclick={addFile}>New file...</ContextMenu.Item>
							<ContextMenu.Item onclick={addDir}>New folder...</ContextMenu.Item>
							{#if !cur.isDir || cur.item.path !== data.tree!.path}
								<ContextMenu.Separator />
							{/if}
						{/if}
						{#if cur.item.path !== data.tree!.path}
							<ContextMenu.Item onclick={deleteNode}>Delete {!cur.isDir ? 'File' : 'Folder'}</ContextMenu.Item>
						{/if}
						{#if !cur.isDir && cur.item.path.endsWith('.typ')}
							<ContextMenu.CheckboxItem checked={cur.item.path === controller.previewFile} onCheckedChange={(checked) => {
								if (checked) {
									controller.eventListener.fire('sidebarPreviewFileChange', {file: cur.item as any});
									controller.previewFile = cur.item.path;
								}
							}}>
								Preview This File
							</ContextMenu.CheckboxItem>
						{/if}
					{/if}
					{#if controller.debug}
						<ContextMenu.Separator />
						<ContextMenu.Item
							onclick={() => {
								console.log($state.snapshot(data.tree));
							}}>Log tree</ContextMenu.Item
						>
					{/if}
				{/if}
			</ContextMenu.Content>
		</ContextMenu.Root>
	</Sidebar.Content>
	<Sidebar.Footer>
		<Sidebar.Menu>
			{#each items as item (item.title)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton>
						{#snippet child({ props })}
							<a href={item.url} {...props}>
								<item.icon />
								<span>{item.title}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>

{#snippet previewing()}
<div class="bg-red w-20 h-8">
	<p>Currently previewing this file.</p>
</div>
{/snippet}

<!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
{#snippet Tree({ item }: { item: SidebarNode })}
	{#if !isFolder(item)}
		{#if item.new}
			<Sidebar.MenuButton
				isActive={item.path === controller.activeFile}
				class="from-emerald-500/20 to-cyan-500/20 data-[active=true]:bg-gradient-to-r data-[active=true]:font-semibold"
			>
				<File />
				<Input
					bind:value={item.name}
					class="h-7 w-full rounded-none px-1 py-0.5 focus-visible:outline-0 focus-visible:ring-offset-1"
					id="newFileFocus"
					onblur={(e) => finalizeNewFile(e, item)}
					onkeypress={(e) => finalizeNewFile(e, item)}
				/>
			</Sidebar.MenuButton>
		{:else}
			<Sidebar.MenuButton
				isActive={item.path === controller.activeFile}
				class="relative select-none rounded-none from-emerald-500/20 to-cyan-500/20 data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold"
				style="-webkit-user-drag: element;"
				onmouseenter={() => {
					hoverQueue.add(item, false);
				}}
				onmouseleave={() => {
					hoverQueue.remove(item);
				}}
				draggable="true"
				ondragstart={(e) => dragStart(e, item)}
				onclick={() => {
					controller.eventListener.fire('sidebarFileClick', {file: item});
					}}
				tooltipContent={item.path === controller.previewFile ? previewing : undefined}
			>
				{#if item.path === controller.previewFile}
					<div class="absolute left-0 top-0 h-full w-1 bg-emerald-400"></div>
				{/if}
				<File />
				{item.name}
				<span class="h-full w-full"></span>
			</Sidebar.MenuButton>
		{/if}
	{:else if item.new}
		<Sidebar.MenuButton>
			<Folder />
			<Input
				bind:value={item.name}
				class="h-7 w-full rounded-none px-1 py-0.5 focus-visible:outline-0 focus-visible:ring-offset-1"
				id="newDirFocus"
				onblur={(e) => finalizeNewDir(e, item)}
				onkeypress={(e) => finalizeNewDir(e, item)}
			/>
		</Sidebar.MenuButton>
	{:else}
		<Sidebar.MenuItem class={`rounded-none ${dragTarget?.path == item.path ? 'bg-sidebar-accent' : ''}`}>
			<Collapsible.Root
				class="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
				open={item.name === 'lib' || item.name === 'components' || item.open}
				onOpenChange={(open) => {
					item.open = open;
				}}
				ondragenter={(e) => {
					dragState.hoverTimer = Date.now();
				}}
				ondragover={(e) => {
					if (!item.open && Date.now() - dragState.hoverTimer > 500 && dragState.dragged !== item) {
						dragState.hoverTimer = Date.now();
						item.open = true;
					}
					dragOverFolder(e, item);
				}}
				ondragleave={() => {
					dragState.targets.delete(item);
				}}
			>
				<Collapsible.Trigger draggable="true" ondragstart={(e) => dragStart(e, item)}>
					{#snippet child({ props })}
						<Sidebar.MenuButton
							class="rounded-none"
							{...props}
							onmouseenter={() => {
								hoverQueue.add(item, true);
							}}
							onmouseleave={() => {
								hoverQueue.remove(item);
							}}
						>
							<ChevronRight className="transition-transform" />
							<Folder />
							{item.name}
						</Sidebar.MenuButton>
					{/snippet}
				</Collapsible.Trigger>
				<Collapsible.Content>
					<Sidebar.MenuSub class="mr-0 gap-0 pr-0">
						{#if item.children}
							{#each item.children as child, index (index)}
								{@render Tree({ item: child })}
							{/each}
						{/if}
					</Sidebar.MenuSub>
				</Collapsible.Content>
			</Collapsible.Root>
		</Sidebar.MenuItem>
	{/if}
{/snippet}
