<script lang="ts">
	import { enhance } from '$app/forms';
	import NewProjectDialog from '$lib/components/new-project-dialog.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

{#if data.user}
	<h1>Welcome, {data.user.username}!</h1>
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
    </form>
{:else}
	<h1>Welcome!</h1>

	<h1>Login/Register</h1>
	<form method="post" action="?/login" use:enhance>
		<label>
			Username
			<input name="username" class="bg-background" />
		</label>
		<label>
			Password
			<input type="password" class="bg-background" name="password" />
		</label>
		<button>Login</button>
		<button formaction="?/register">Register</button>
	</form>
	<p style="color: red">{form?.message ?? ''}</p>
{/if}
