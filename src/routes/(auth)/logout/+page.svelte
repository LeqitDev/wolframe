<script lang="ts">
	import { goto } from "$app/navigation";
	import { authClient } from "$lib/auth-client";
    import logo from "$lib/assets/wolframe-icon.svg";

    $effect(() => {
        (async () => {
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        // Redirect to the login page after successful logout
                        goto("/auth", {
                            replaceState: true,
                        });
                    },
                }
            })
        })()
    })
</script>

<div class="flex flex-col items-center justify-center h-screen gap-4">
    <img src={logo} alt="Logo" class="w-32 h-32" />
    <h1 class="text-2xl font-bold">Logging out...</h1>
    <p class="text-sm">You will be redirected to the login page shortly.</p>
</div>