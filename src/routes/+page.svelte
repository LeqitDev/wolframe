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

	let { data, form }: { data: PageData; form: ActionData } = $props();
    
    console.log(data);
    
</script>

{#if data.user}
    <TopNav />
    <div class="flex">
        <HomeSidebar />
        <div class="flex-1 p-6">
            <h1 class="text-3xl font-bold mb-6">My Workspace</h1>
            <div class="space-y-8">
                <div>
                    <h2 class="text-2xl font-semibold mb-4">New Proejct</h2>
                    <div class="grid gap-4 grid-cols-4 mb-8">
                        <button>
                            <Card.Root class="hover:bg-muted/50 transition-colors bg-background">
                                <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <Card.Title class="text-sm font-medium">New Document</Card.Title>
                                    <FileText class="size-4 text-muted-foreground" />
                                </Card.Header>
                                <Card.Content class="pt-0 text-start">
                                    <p class="text-xs text-muted-foreground">Start a new project to create a document.</p>
                                </Card.Content>
                            </Card.Root>
                        </button>
                        <button>
                            <Card.Root class="hover:bg-muted/50 transition-colors bg-background">
                                <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <Card.Title class="text-sm font-medium">New Package</Card.Title>
                                    <Package class="size-4 text-muted-foreground" />
                                </Card.Header>
                                <Card.Content class="pt-0 text-start">
                                    <p class="text-xs text-muted-foreground">Start a new project as a package for later use or shared extension.</p>
                                </Card.Content>
                            </Card.Root>
                        </button>
                    </div>
                    <RecentProjectsList projects={data.projects} />
                </div>
            </div>
        </div>
        <!-- <h1>Welcome, {data.user.username}!</h1>
        {#each data.projects as project}
            <a href="/project/{project.id}">{project.name}</a>
        {:else}
            <p>No projects found. <NewProjectDialog data={data.newProjectForm} user={data.user} /></p>
        {/each}

        {#each data.teams as team}
            <a href="/team/{team.teams.id}">{team.teams.name}</a>
        {:else}
            <p>No teams found. <a href="#">Create a new Team</a></p>
        {/each}

        {#each data.invites as invite}
            <form method="post" action="?/team/invite/{invite.teamId}" use:enhance>
                <button>Accept Invite</button>
            </form>
        {:else}
            <p>No team invites found.</p>
        {/each}

        <form method="post" action="?/logout" use:enhance>
            <button>Logout</button>
        </form> -->
    </div>
{:else}
	<LoginScreen form={form} />
{/if}
