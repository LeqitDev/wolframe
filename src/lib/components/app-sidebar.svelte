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
			title: 'Home',
			url: '#',
			icon: House
		},
		{
			title: 'Project Settings',
			url: '#',
			icon: Settings
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
				<div class="flex">
					<img src={projectAvatar} alt="Avatar" class="size-8 rounded-md" />
					<span class="group-data-[collapsible=icon]:hidden">{pdata.project.name}</span>
				</div>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
			<Sidebar.GroupLabel>Project Files</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each data.tree as item, index (index)}
						{@render Tree({ item })}
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
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
			class="data-[active=true]:bg-transparent"
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
						<Sidebar.MenuButton {...props}>
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
