<script lang="ts">
	import { Folder, LayoutDashboard, PlusCircle } from "lucide-svelte";
import { Button } from "./ui/button";

    let {
        teams,
        curView = $bindable("home"),
        teamId = $bindable(null),
    }: {
        teams: {
    teams: {
        name: string;
        id: string;
        createdAt: Date;
    };
    team_members: {
        role: "owner" | "member";
        userId: string;
        teamId: string;
    };
}[];
        curView: 'home' | 'personal' | 'team';
        teamId: string | null;
    } = $props();

</script>

<div class="w-64 border-r min-h-[calc(100vh-4rem-1px)] bg-card">
    <div class="h-[calc(100vh-4rem-1px)]">
        <div class="space-y-4 py-4">
            <div class="px-3 py-2">
                <h2 class="mb-2 px-4 text-lg font-semibold tracking-tight">Personal</h2>
                <div class="space-y-1">
                    <Button onclick={() => {
                        curView = 'home';
                    }} variant="ghost" class={`w-full justify-start${curView === 'home' ? ' bg-secondary' : ''}`}><LayoutDashboard class="mr-2 size-4" />Overview</Button>
                    <Button onclick={() => {
                        curView = 'personal';
                    }} variant="ghost" class={`w-full justify-start${curView === 'personal' ? ' bg-secondary' : ''}`}><Folder class="mr-2 size-4" />Projects</Button>
                </div>
            </div>
            <div class="px-3 py-2">
                <h2 class="mb-2 px-4 text-lg font-semibold tracking-tight">Teams</h2>
                <div class="space-y-1">
                    {#each teams as team}
                        <Button onclick={() => {
                            teamId = team.teams.id;
                            curView = 'team';
                        }} variant="ghost" class="w-full justify-start">
                            <Folder class="mr-2 size-4" />
                            {team.teams.name}
                        </Button>
                    {/each}
                    <Button variant="ghost" class="w-full justify-start text-muted-foreground"><PlusCircle class="mr-2 size-4" />Create New Team</Button>
                </div>
            </div>
        </div>
    </div>
</div>