<script lang="ts">
	import { Search } from "lucide-svelte";
import { Button } from "./ui/button";
	import { Input } from "./ui/input";
	import UserNav from "./user-nav.svelte";


</script>

<nav class="border-b">
    <div class="flex h-16 items-center px-4">
        <h2 class="font-semibold text-xl mr-6">Wolframe</h2>
        <div class="flex-1 flex items-center">
            <div class="relative w-full max-w-sm">
                <Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input class="pl-12" placeholder="Search..." />
            </div>
        </div>
        <div class="ml-auto flex items-center space-x-4">
            <Button>New Project</Button>
            <UserNav />
        </div>
    </div>
</nav>