<script lang="ts">
    import { Button } from 'flowbite-svelte';
    import { afterUpdate } from 'svelte';
    import { clearRunLog, runLogStore } from '$lib/spike/run-log';

    const levelClasses = {
        info: 'text-gray-700',
        warn: 'text-amber-700',
        error: 'text-red-700'
    } as const;

    let logContainer: HTMLDivElement;

    afterUpdate(() => {
        logContainer?.scrollTo({ top: logContainer.scrollHeight });
    });
</script>

<section class="mx-3 mt-3 w-72 rounded border border-gray-300 bg-white text-xs shadow-sm">
    <div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-2 py-1">
        <h2 class="font-semibold text-gray-800">Robot run log</h2>
        <Button color="light" size="xs" on:click={clearRunLog}>Clear</Button>
    </div>
    <div
        bind:this={logContainer}
        class="max-h-56 overflow-y-auto break-all p-2 font-mono"
        aria-live="polite"
    >
        {#if $runLogStore.length === 0}
            <p class="text-gray-500">Run the robot to capture diagnostics.</p>
        {:else}
            {#each $runLogStore as entry (entry.id)}
                <p class={levelClasses[entry.level]}>
                    <span class="text-gray-500">[{entry.timestamp}]</span>
                    <span class="font-semibold">{entry.level.toUpperCase()}</span>
                    {entry.message}
                </p>
            {/each}
        {/if}
    </div>
</section>
