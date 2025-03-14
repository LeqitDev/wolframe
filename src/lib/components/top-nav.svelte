<script lang="ts">
	import { Bell, Search } from "lucide-svelte";
import { Button } from "./ui/button";
	import { Input } from "./ui/input";
	import UserNav from "./user-nav.svelte";
	import NotificationCenter from "./notification-center.svelte";

    let {
        invites,
        curView = $bindable("home"),
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
        curView: 'home' | 'personal' | 'team';
    } = $props();

</script>

<nav class="shadow-md">
    <div class="flex h-16 items-center px-4">
        <button onclick={() => {
            curView = 'home';
        }}><h2 class="font-semibold text-2xl mr-6" style="font-variant: small-caps;">Wolframe</h2></button>
        <div class="flex-1 flex items-center">
            <div class="relative w-full max-w-sm">
                <Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input class="pl-12" placeholder="Search..." />
            </div>
        </div>
        <div class="ml-auto flex items-center space-x-4">
            <NotificationCenter {invites} />
            <UserNav />
        </div>
    </div>
</nav>