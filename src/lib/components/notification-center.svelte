<script lang="ts">
    import * as Popover from '$lib/components/ui/popover';
	import { Bell, Check, Cross, X } from 'lucide-svelte';
	import { Button } from './ui/button';

    let {
        invites
    }: {
        invites: {
    teams: {
        id: string;
        name: string;
        createdAt: Date;
    };
    team_invites: {
        userId: string;
        createdAt: Date;
        teamId: string;
        role: "owner" | "member";
    };
}[];
    } = $props();
</script>


<Popover.Root>
    <Popover.Trigger>
        {#snippet child({props})}
            <Button {...props} variant="ghost" size="icon">
                <Bell class="size-5" />
            </Button>
        {/snippet}
    </Popover.Trigger>
    <Popover.Content class="brightness-110 w-auto min-w-72" align="end">
        <div class="p-2">
            <h3 class="text-lg font-semibold mb-4">Notifications</h3>
            <div class="space-y-4">
                {#each invites as invite}
                    <div class="flex items-center justify-between gap-8">
                        <div>
                            <p class="text-sm font-semibold">Team Invite</p>
                            <p class="text-xs text-muted-foreground">{invite.teams.name} invited you to join their team.</p>
                        </div>
                        <div class="flex gap-2">
                            <Button variant="outline" size="icon"><Check /></Button>
                            <Button variant="outline" size="icon"><X /></Button>
                        </div>
                    </div>
                {:else}
                    <p class="text-sm text-muted-foreground">No new notifications.</p>
                {/each}
            </div>
        </div>
    </Popover.Content>
</Popover.Root>
