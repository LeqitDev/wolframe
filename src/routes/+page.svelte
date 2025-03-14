<script lang="ts">
	import { enhance } from '$app/forms';
	import HomeSidebar from '$lib/components/home-sidebar.svelte';
	import LoginScreen from '$lib/components/login-screen.svelte';
	import NewProjectDialog from '$lib/components/new-project-dialog.svelte';
	import * as Card from '$lib/components/ui/card';
	import TopNav from '$lib/components/top-nav.svelte';
	import type { ActionData, PageData } from './$types';
	import { FileText, Package } from 'lucide-svelte';
	import RecentProjectsList from '$lib/components/recent-projects-list.svelte';
	import { crossfade, fade, fly } from 'svelte/transition';

	let { data, form }: { data: PageData; form: ActionData } = $props();

    let curView: 'home' | 'personal' | 'team' = $state('home');
    let teamId: string | null = $state(null);

    let views = {
        home: home,
        personal: personal,
        team: team
    }

	console.log(data);
</script>

{#snippet home({ data }: { data: PageData })}
<div transition:fly>
	<h1 class="mb-6 text-3xl font-bold">My Workspace</h1>
	<div class="space-y-8">
		<div>
			<h2 class="mb-4 text-2xl font-semibold">New Proejct</h2>
			<div class="mb-8 grid grid-cols-4 gap-4">
				<NewProjectDialog data={data.newProjectForm!} user={data.user!} isPackage={false}>
					<Card.Root class="h-full bg-card transition-colors hover:bg-accent">
						<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
							<Card.Title class="text-sm font-medium">New Document</Card.Title>
							<FileText class="size-4 text-muted-foreground" />
						</Card.Header>
						<Card.Content class="pt-0 text-start">
							<p class="text-xs text-muted-foreground">Start a new project to create a document.</p>
						</Card.Content>
					</Card.Root>
				</NewProjectDialog>
				<NewProjectDialog data={data.newProjectForm!} user={data.user!} isPackage>
					<Card.Root class="h-full bg-card transition-colors hover:bg-accent">
						<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
							<Card.Title class="text-sm font-medium">New Package</Card.Title>
							<Package class="size-4 text-muted-foreground" />
						</Card.Header>
						<Card.Content class="pt-0 text-start">
							<p class="text-xs text-muted-foreground">
								Start a new project as a package for later use or shared extension.
							</p>
						</Card.Content>
					</Card.Root>
				</NewProjectDialog>
			</div>
			{#if data.projects && data.projects.length > 0}
				<RecentProjectsList projects={data.projects!} />
			{/if}
		</div>
	</div>
    </div>
{/snippet}

{#snippet personal({ data }: { data: PageData })}
    <div transition:fly>
        <h1 class="mb-6 text-3xl font-bold">Personal Projects</h1>
        <RecentProjectsList projects={data.projects!} />
    </div>
{/snippet}

{#snippet team({ data }: { data: PageData })}
    <h1 class="mb-6 text-3xl font-bold">Team Projects</h1>
    <RecentProjectsList projects={data.projects!} />
{/snippet}

{#if data.user}
	<TopNav invites={data.invites} bind:curView={curView} />
	<div class="flex">
		<HomeSidebar bind:teamId={teamId} bind:curView={curView} teams={data.teams} />
		<div class="flex-1 p-6">
			{@render views[curView]({ data })}
		</div>
	</div>
{:else}
	<LoginScreen {form} />
{/if}
