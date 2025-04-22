<script lang="ts">
	import { goto } from "$app/navigation";
	import { authClient } from "$lib/auth-client";
	import { FlashMessage, getFlashManager } from "@/lib/frontend/stores/Flash.svelte";

    const flashManager = getFlashManager();

    $effect(() => {
        (async () => {
            const { data: session, error } = await authClient.getSession();

            if (session) {
                flashManager.add(new FlashMessage("success", "Login successful! Welcome back!"));
                goto('/', { replaceState: true });
            } else {
                flashManager.add(new FlashMessage("error", "Login failed. Please try again.", null));
                goto('/auth', { replaceState: true });
            }
        })();
        
    });
</script>