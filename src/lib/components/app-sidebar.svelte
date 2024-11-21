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

	interface FileMetadata {
		filename: string;
		mimetype: string;
		size: number;
		lastModified: Date;
		etag: string;
		path: string;
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
			url: '#',
			icon: House
		}
	];

	let data = $state({
		tree: [
			['lib', ['components', 'button.svelte', 'card.svelte'], 'utils.ts'],
			[
				'routes',
				['hello', '+page.svelte', '+page.ts'],
				'+page.svelte',
				'+page.server.ts',
				'+layout.svelte'
			],
			['static', 'favicon.ico', 'svelte.svg'],
			'eslint.config.js',
			'.gitignore',
			'svelte.config.js',
			'tailwind.config.js',
			'package.json',
			'README.md'
		]
	});

	let { pdata }: { pdata: any } = $props();

	let projectAvatar = createAvatar(initials, {
		seed: pdata.project.name,
		radius: 5
	}).toDataUri();

	$effect(() => {
		data = {
			tree: parsePageData(pdata)
		};
	});

	let currentHovered: null | { name: string; isDir: boolean } = $state(null);
	let open = $state(false);
	let staticHovered: null | { name: string; isDir: boolean } = $state(null);

	$effect(() => {
		if (!open) {
			staticHovered = currentHovered;
		}
	});

	function parsePageData(data: { files: FileMetadata[]; project_path: string }) {
		const tree: any[] = [];
		const dirMap = new Map<string, any[]>();

		// Sort files by path to ensure parent directories are processed first
		const sortedFiles = [...data.files].sort((a, b) => a.path.localeCompare(b.path));

		for (const file of sortedFiles) {
			const parts = file.path.replace(data.project_path, '').split('/').filter(Boolean);
			const fileName = parts[parts.length - 1];

			if (parts.length === 1) {
				// Root level file
				tree.push(fileName);
				continue;
			}

			let currentLevel = tree;
			for (let i = 0; i < parts.length - 1; i++) {
				const dirName = parts[i];

				// Find or create directory array in current level
				let dirArray = currentLevel.find((item) => Array.isArray(item) && item[0] === dirName);

				if (!dirArray) {
					dirArray = [dirName];
					currentLevel.push(dirArray);
				}

				currentLevel = dirArray;
			}

			currentLevel.push(fileName);
		}

		return tree;
	}
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<div class="flex items-center group-data-[collapsible=icon]:justify-center">
					<img
						src={projectAvatar}
						alt="Avatar"
						class="size-9 rounded-md group-data-[collapsible=icon]:size-7"
					/>
					<span class="pl-2 text-lg font-bold group-data-[collapsible=icon]:hidden"
						>{pdata.project.name}</span
					>
				</div>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<ContextMenu.Root bind:open>
			<ContextMenu.Trigger class="h-full">
				<Sidebar.Group class="group-data-[collapsible=icon]:hidden h-full">
					<Sidebar.GroupLabel>Project Files</Sidebar.GroupLabel>
					<Sidebar.GroupContent>
						<Sidebar.Menu>
							{#each data.tree as item, index (index)}
								{@render Tree({ item })}
							{/each}
						</Sidebar.Menu>
					</Sidebar.GroupContent>
				</Sidebar.Group></ContextMenu.Trigger
			>
			<ContextMenu.Content>
				{@const cur = $state.snapshot(staticHovered)}
				{#if cur}
					<ContextMenu.Item>Delete {!cur.isDir ? "File" : "Folder"}</ContextMenu.Item>
				{/if}
				<ContextMenu.Item>Add folder</ContextMenu.Item>
				<ContextMenu.Item>Add file</ContextMenu.Item>
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

<!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
{#snippet Tree({ item }: { item: string | any[] })}
	{@const [name, ...items] = Array.isArray(item) ? item : [item]}
	{#if !items.length}
		<Sidebar.MenuButton
			isActive={name === 'button.svelte'}
			class="data-[active=true]:bg-transparent" onmouseenter={() => {
				currentHovered = { name, isDir: false };
			}} onmouseleave={() => {
							currentHovered = null;
						}}
		>
			<File />
			{name}
		</Sidebar.MenuButton>
	{:else}
		<Sidebar.MenuItem>
			<Collapsible.Root
				class="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
				open={name === 'lib' || name === 'components'}
			>
				<Collapsible.Trigger>
					{#snippet child({ props })}
						<Sidebar.MenuButton {...props} onmouseenter={() => {
							currentHovered = { name, isDir: true };
						}} onmouseleave={() => {
							currentHovered = null;
						}}>
							<ChevronRight className="transition-transform" />
							<Folder />
							{name}
						</Sidebar.MenuButton>
					{/snippet}
				</Collapsible.Trigger>
				<Collapsible.Content>
					<Sidebar.MenuSub>
						{#each items as subItem, index (index)}
							{@render Tree({ item: subItem })}
						{/each}
					</Sidebar.MenuSub>
				</Collapsible.Content>
			</Collapsible.Root>
		</Sidebar.MenuItem>
	{/if}
{/snippet}
