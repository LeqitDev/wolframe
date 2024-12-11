<script lang="ts">
	import { Folder, PlusCircle } from "lucide-svelte";
import { Button } from "./ui/button";

</script>

<div class="w-64 border-r min-h-screen bg-muted/20">
    <div class="h-[calc(100vh-4rem)]">
        <div class="space-y-4 py-4">
            <div class="px-3 py-2">
                <h2 class="mb-2 px-4 text-lg font-semibold tracking-tight">Personal</h2>
                <div class="space-y-1">
                    <Button variant="ghost" class="w-full justify-start"><Folder class="mr-2 size-4" />Projects</Button>
                </div>
            </div>
            <div class="px-3 py-2">
                <h2 class="mb-2 px-4 text-lg font-semibold tracking-tight">Teams</h2>
                <div class="space-y-1">
                    <Button variant="ghost" class="w-full justify-start">
                        <Folder class="mr-2 size-4" />
                        LUL
                    </Button>
                    <Button variant="ghost" class="w-full justify-start text-muted-foreground"><PlusCircle class="mr-2 size-4" />Create New Team</Button>
                </div>
            </div>
        </div>
    </div>
</div>