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

	class HoverQueue {
		queue: { item: App.Sidebar.FileSystemNode; isDir: boolean }[] = $state([]);
		freezedHovered: null | { item: App.Sidebar.FileSystemNode; isDir: boolean } = $state(null);

		add(item: App.Sidebar.FileSystemNode, isDir: boolean) {
			this.queue.push({ item, isDir });
		}

		remove(item: App.Sidebar.FileSystemNode) {
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

	let {
		pdata,
		activeFile = $bindable(),
		previewFile = $bindable(),
		debug = false,
		onFileClick = () => {},
		onNodeMoved = () => {},
		onNewFile = () => {},
		onNewDir = () => {},
		onFileDeleted = () => {},
		onDirDeleted = () => {},
		onPreviewFileChange = () => {}
	}: {
		pdata: any;
		activeFile: string;
		previewFile: string;
		debug?: boolean;
		onFileClick?: (file: App.Sidebar.FileMetadata) => void;
		onNodeMoved?: (node: App.Sidebar.FileSystemNode, prev_path: string) => void;
		onNewFile?: (file: App.Sidebar.FileMetadata) => void;
		onNewDir?: (dir: App.Sidebar.FileSystemFolder) => void;
		onFileDeleted?: (file: App.Sidebar.FileMetadata) => void;
		onDirDeleted?: (dir: App.Sidebar.FileSystemFolder) => void;
		onPreviewFileChange?: (file: App.Sidebar.FileMetadata) => void;
	} = $props();

	let data: { tree: App.Sidebar.FileSystemFolder } = $state({
		tree: parsePageData(pdata)
	});

	let dragState: {
		dragged: App.Sidebar.FileSystemNode | null;
		targets: SvelteSet<App.Sidebar.FileSystemFolder>;
		hoverTimer: number;
	} = $state({
		dragged: null,
		targets: new SvelteSet(),
		hoverTimer: 0
	});

	let dragTarget = $derived.by(() => {
		// highest depth folder in dragState.targets
		let maxDepth = -1;
		let target: App.Sidebar.FileSystemFolder | null = null;
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

	function validateDragTarget(dragged: App.Sidebar.FileSystemNode, target: App.Sidebar.FileSystemFolder): boolean {
		// Prevent dragging into own children or self
		return !(dragged.path === target.path && dragged.type === target.type);
	}

	let projectAvatar = createAvatar(initials, {
		seed: pdata.project.name,
		radius: 5
	}).toDataUri();

	$effect(() => {
		if (dragTarget) {
			forEachTreeNode;
		}
	});

	let hoverQueue = new HoverQueue();
	let reloadedStaticHovered = $state(true);
	$inspect(hoverQueue.queue);
	let contextMenuVisibility = $state(false);
	/* let currentHovered: null | { item: App.Sidebar.FileSystemNode; isDir: boolean } = $state(null);
	let staticHovered: null | { item: App.Sidebar.FileSystemNode; isDir: boolean } = $state(null); */

	/* $effect(() => {
		if (!contextMenuVisibility) {
			staticHovered = currentHovered;
		}
	}); */

	function fileSystemFileToFileMetadata(file: App.Sidebar.FileSystemFile): App.Sidebar.FileMetadata {
		return {
			filename: file.name,
			mimetype: file.mimetype,
			size: file.size,
			lastModified: file.lastModified,
			etag: file.etag,
			path: file.path
		};
	}

	function parsePageData(data: { files: App.Sidebar.FileMetadata[]; project_path: string }) {
		const root: App.Sidebar.FileSystemNode = {
			name: data.project_path.split('/').pop() || '',
			type: 'directory',
			children: [],
			depth: 0,
			open: true,
			path: data.project_path.substring(0, data.project_path.length)
		};

		const filesByDirectory: Map<string, App.Sidebar.FileMetadata[]> = new Map();
		data.files.forEach((file) => {
			const dirPath = file.path.replace(file.filename, '').trim();
			if (!filesByDirectory.has(dirPath)) {
				filesByDirectory.set(dirPath, []);
			}
			filesByDirectory.get(dirPath)?.push(file);
		});

		const buildDirectoryTree = (basePath: string, parentNode: App.Sidebar.FileSystemNode) => {
			if (parentNode.type === 'file') return;

			const directFiles = data.files.filter(
				(f) =>
					f.path.startsWith(basePath) &&
					f.path.split('/').filter((p) => p).length ===
						basePath.split('/').filter((p) => p).length + 1
			);

			directFiles.forEach((file) => {
				const fileNode: App.Sidebar.FileSystemNode = {
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
				const dirNode: App.Sidebar.FileSystemNode = {
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
	function findAndRemoveItem(tree: App.Sidebar.FileSystemNode, delitem: App.Sidebar.FileSystemNode): App.Sidebar.FileSystemNode | null {
		let removedItem: App.Sidebar.FileSystemNode | null = null;
		

		if (tree.type === 'directory') {
			for (let i = 0; i < tree.children.length; i++) {
				const item = tree.children[i];
				

				// If it's a file and matches the path and type, remove it
				if (item.path === delitem.path && item.type === delitem.type) {
					return tree.children.splice(i, 1)[0];
				}

				// If it's a directory, recursively search only if the path is a prefix
				if (item.type === 'directory' && delitem.path.startsWith(item.path)) {
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
	function insertItemInFolder(tree: App.Sidebar.FileSystemNode, folder: App.Sidebar.FileSystemNode, item: App.Sidebar.FileSystemNode) {
		if (item.path === folder.path) {
			console.error('Cannot insert item into itself');
			return;
		}

		const parts = item.path.replace(tree.path, '').split('/').filter(Boolean);
		let current = tree;

		if (current.type === 'directory') {
			for (const part of parts.slice(0, -1)) {
				const dir: App.Sidebar.FileSystemNode | undefined = current.children.find(
					(child) => child.name === part
				);

				if (!dir || dir.type !== 'directory') {
					console.error('Directory not found');
					return;
				}

				current = dir;
			}

			current.children.push(item);

			// Sort the children
			current.children.sort((a, b) => {
				const isADir = a.type === 'directory';
				const isBDir = b.type === 'directory';

				if (isADir && !isBDir) return -1;
				if (!isADir && isBDir) return 1;

				return a.name.localeCompare(b.name);
			});
		}
	}

	function moveItemInTree(
		tree: App.Sidebar.FileSystemNode,
		curFolder: App.Sidebar.FileSystemNode,
		curDragged: App.Sidebar.FileSystemNode
	) {
		// Remove the item from its current location
		const removedItem = findAndRemoveItem(tree, curDragged);

		if (!removedItem) {
			console.error('Item not found in the tree');
			return tree;
		}

		// Update the path of the dragged item
		const newPath = `${curFolder.path}/${curDragged.name}`;
		const prevPath = removedItem.path;
		
		if (previewFile === prevPath) {
			previewFile = newPath;
		}

		if (activeFile === prevPath) {
			activeFile = newPath;
		}

		removedItem.path = newPath;

		onNodeMoved(removedItem, prevPath);

		// Insert the item into the new location
		insertItemInFolder(tree, curFolder, removedItem);

		return tree;
	}

	function addFile() {
		let hovered = hoverQueue.freezedHovered;

		if (hovered && hovered.isDir) {
			const newFile = {
				name: '',
				type: 'file',
				new: true,
				mimetype: 'plain/text',
				size: 0,
				lastModified: new Date(),
				etag: '',
				path: hovered.item.path + '...'
			} as App.Sidebar.FileSystemNode;

			insertItemInFolder(data.tree, hovered.item as App.Sidebar.FileSystemNode, newFile);
			setTimeout(() => {
				let newFileFocus = document.getElementById('newFileFocus');

				if (newFileFocus) {
					newFileFocus.focus();
				}
			}, 10);
		}
	}

	function finalizeNewFile(e: FocusEvent | KeyboardEvent, item: App.Sidebar.FileSystemNode) {
		if (e.type === 'keypress' && (e as KeyboardEvent).key !== 'Enter' || !item.new) return;
		if (item.name === '') {
			findAndRemoveItem(data.tree, item);
		} else {
			item.path = item.path.substring(0, item.path.length - 3) + item.name;
			console.log('New file:', $state.snapshot(item));
			
			// TODO: New file callback
			onNewFile(fileSystemFileToFileMetadata(item as App.Sidebar.FileSystemFile));
			item.new = false;
		}
	}

	function addDir() {
		let hovered = hoverQueue.freezedHovered;

		if (hovered && hovered.isDir) {
			hovered.item = hovered.item as App.Sidebar.FileSystemNode;
			console.log(hovered.item.path);

			if (hovered.item.type === 'file') {
				console.error('Cannot create a directory inside a file');
				return;
			}

			const newDir = {
				name: '',
				type: 'directory',
				new: true,
				children: [],
				open: false,
				depth: hovered.item.depth + 1,
				path: hovered.item.path + '/...'
			} as App.Sidebar.FileSystemFolder;
			insertItemInFolder(data.tree, hovered.item, newDir);

			setTimeout(() => {
				let newDirFocus = document.getElementById('newDirFocus');

				if (newDirFocus) {
					newDirFocus.focus();
				}
			}, 100);
		}
	}

	function finalizeNewDir(e: FocusEvent | KeyboardEvent, item: App.Sidebar.FileSystemNode) {
		if (e.type === 'keypress' && (e as KeyboardEvent).key !== 'Enter') return;
		if (item.name === '') {
			findAndRemoveItem(data.tree, item);
		} else {
			item.path = item.path.substring(0, item.path.length - 3) + item.name;
			onNewDir(item as App.Sidebar.FileSystemFolder);
			item.new = false;
		}
	}

	function forEachTreeNode(tree: App.Sidebar.FileSystemNode, callback: (node: App.Sidebar.FileSystemNode) => boolean) {
		let terminate = false;
		if (tree.type === 'directory') {
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
			moveItemInTree(data.tree, dragTarget!, dragState.dragged!);

			// TODO: Move file callback

			dragState.dragged = null;
			dragState.targets.clear();
		}
	}

	function dragEnd(e: DragEvent) {
		dragState.dragged = null;
		dragState.targets.clear();
	}

	function dragStart(e: DragEvent, item: App.Sidebar.FileSystemNode) {
		dragState.dragged = item;
		e.dataTransfer?.setData('text/plain', item.path);
	}

	function dragOverFolder(e: DragEvent, folder: App.Sidebar.FileSystemFolder) {
		e.preventDefault();
		if (dragState.dragged) {
			dragState.targets.add(folder);
		}
	}

	function deleteNode() {
		let hovered = hoverQueue.freezedHovered;

		if (hovered) {
			const item = hovered.item;
			const removedItem = findAndRemoveItem(data.tree, item);

			if (item.type === 'file') {
				onFileDeleted(fileSystemFileToFileMetadata(removedItem as App.Sidebar.FileSystemFile));
			} else {
				onDirDeleted(removedItem as App.Sidebar.FileSystemFolder);
			}
		}
	}
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
						>{pdata.project.name}</span
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
								hoverQueue.add(data.tree, true);
							}}
							onmouseleave={() => {
								hoverQueue.remove(data.tree);
							}}
							ondragover={(e) => dragOverFolder(e, data.tree)}
							ondrop={drop}
							ondragend={dragEnd}
							class={`h-full gap-0 ${dragTarget?.path === pdata.project_path ? 'bg-sidebar-accent' : ''}`}
						>
							{#if data.tree.children}
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
							{#if !cur.isDir || cur.item.path !== data.tree.path}
								<ContextMenu.Separator />
							{/if}
						{/if}
						{#if cur.item.path !== data.tree.path}
							<ContextMenu.Item onclick={deleteNode}>Delete {!cur.isDir ? 'File' : 'Folder'}</ContextMenu.Item>
						{/if}
						{#if !cur.isDir && cur.item.path.endsWith('.typ')}
							<ContextMenu.CheckboxItem checked={cur.item.path === previewFile} onCheckedChange={(checked) => {
								if (checked) {
									onPreviewFileChange(fileSystemFileToFileMetadata(cur.item as App.Sidebar.FileSystemFile));
									previewFile = cur.item.path;
								}
							}}>
								Preview This File
							</ContextMenu.CheckboxItem>
						{/if}
					{/if}
					{#if debug}
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
{#snippet Tree({ item }: { item: App.Sidebar.FileSystemNode })}
	{#if item.type === 'file'}
		{#if item.new}
			<Sidebar.MenuButton
				isActive={item.path === activeFile}
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
				isActive={item.path === activeFile}
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
				onclick={() => onFileClick(fileSystemFileToFileMetadata(item as App.Sidebar.FileSystemFile))}
				tooltipContent={item.path === previewFile ? previewing : undefined}
			>
				{#if item.path === previewFile}
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
