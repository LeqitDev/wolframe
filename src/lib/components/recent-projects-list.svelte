<script lang="ts">
    import * as Card from "$lib/components/ui/card";
	import { FileText, Package, Users } from "lucide-svelte";
	import { Badge } from "./ui/badge";
    import moment from "moment";

    let { projects }: {
        projects: { projects: { id: string; name: string; description: string | null; createdAt: Date; updatedAt: Date | null; teamId: string | null; ownerId: string | null; isPackage: boolean; isPublic: boolean; }; teamMembersCount: number; }[];
    } = $props();
</script>

<div>
    <h2 class="text-2xl font-semibold mb-4">Recently Edited</h2>
    <div class="grid gap-4 mb:grid-cols-2 lg:grid-cols-4">
        {#each projects as project}
            <a href={`/project/${project.projects.id}`}>
                <Card.Root class="hover:bg-accent transition-colors bg-card">
                    <Card.Content class="p-4">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex gap-2 items-center">
                                {#if project.projects.isPackage}
                                    <Package class="size-4 text-muted-foreground" />
                                {:else}
                                    <FileText class="size-4 text-muted-foreground" />
                                {/if}
                                <h3 class="font-semibold">{project.projects.name}</h3>
                            </div>
                            <Badge variant={project.projects.teamId ? 'secondary' : 'default'}>{project.projects.teamId ? 'Team' : 'Personal'}</Badge>
                        </div>
                        <p class="text-sm mb-4 text-muted-foreground">{project.projects.description ?? 'No description provided!'}</p>
                        <div class="flex items-center justify-between text-xs text-muted-foreground">
                            {#if project.projects.updatedAt}
                                <span>Updated {(moment(project.projects.updatedAt)).format('DD. MMM YYYY HH:mm')}</span>
                            {:else}
                                <span>Created {(moment(project.projects.createdAt)).format('DD. MMM YYYY')}</span>
                            {/if}
                            {#if project.projects.teamId}
                                <div class="flex items-center">
                                    <Users class="size-3 mr-1" />
                                    <span>{project.teamMembersCount}</span>
                                </div>
                            {/if}
                        </div>
                    </Card.Content>
                </Card.Root>
            </a>
        {:else}
            <p class="text-muted-foreground mt-4">No projects found!</p>
        {/each}
    </div>
</div>