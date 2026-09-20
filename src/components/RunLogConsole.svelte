<script lang="ts">
    import { Button } from 'flowbite-svelte';
    import { afterUpdate } from 'svelte';
    import {
        clearRunLog,
        formatRunLogEntries,
        getRunLogGuidance,
        runLogStore,
        type RunLogLevel
    } from '$lib/spike/run-log';

    export let onOpenDiagnostics: (() => void) | undefined;

    const levelClasses = {
        info: 'text-gray-700',
        warn: 'text-amber-700',
        error: 'text-red-700'
    } as const;

    let logContainer: HTMLDivElement;
    let selectedLevel: 'all' | RunLogLevel = 'all';
    let searchText = '';
    let showRawEvidence = false;

    $: normalizedSearchText = searchText.trim().toLowerCase();
    $: filteredEntries = $runLogStore.filter((entry) => {
        const matchesLevel = selectedLevel === 'all' || entry.level === selectedLevel;
        const matchesText =
            normalizedSearchText.length === 0 ||
            entry.message.toLowerCase().includes(normalizedSearchText);
        return matchesLevel && matchesText;
    });
    $: visibleEntries = [...filteredEntries].reverse();
    $: latestEvent = [...$runLogStore]
        .reverse()
        .find((entry) => entry.level === 'error' || entry.level === 'warn');
    $: diagnosticGuidance = latestEvent ? getRunLogGuidance(latestEvent) : undefined;

    afterUpdate(() => {
        logContainer?.scrollTo({ top: 0 });
    });

    function clearFilters(): void {
        selectedLevel = 'all';
        searchText = '';
    }

    function exportDiagnostics(): void {
        const content = formatRunLogEntries(visibleEntries);
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `robot-run-diagnostics-${new Date().toISOString().replaceAll(':', '-')}.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }
</script>

<section
    class="mx-3 mt-3 w-72 max-w-[calc(100vw-1.5rem)] rounded border border-gray-300 bg-white text-xs shadow-sm"
    aria-labelledby="run-log-title"
>
    <div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-2 py-1">
        <h2 id="run-log-title" class="font-semibold text-gray-800">Robot run diagnostics</h2>
        <div class="flex gap-1">
            <Button
                color="light"
                size="xs"
                on:click={exportDiagnostics}
                disabled={filteredEntries.length === 0}
                title="Download the currently filtered diagnostics">Export</Button
            >
            <Button color="light" size="xs" on:click={clearRunLog}>Clear</Button>
            {#if onOpenDiagnostics}
                <Button color="light" size="xs" on:click={onOpenDiagnostics}
                    >Open diagnostics</Button
                >
            {/if}
        </div>
    </div>

    {#if diagnosticGuidance}
        <div
            class="border-b border-amber-200 bg-amber-50 px-2 py-2 text-amber-950"
            role="status"
            aria-live="polite"
        >
            <p class="font-semibold">What was observed</p>
            <p class="mt-1">{diagnosticGuidance.observation}</p>
            <p class="mt-2 font-semibold">Next action</p>
            <p class="mt-1">{diagnosticGuidance.nextAction}</p>
            <p class="mt-1 text-[11px] text-amber-800">
                This describes contact and motion evidence; it does not prove the contact caused the
                stop.
            </p>
            <button
                type="button"
                class="mt-2 rounded border border-amber-300 bg-white px-2 py-1 font-medium text-amber-900 hover:bg-amber-100"
                on:click={() => (showRawEvidence = true)}
            >
                Inspect diagnostic details
            </button>
        </div>
    {/if}

    <div class="space-y-2 border-b border-gray-200 px-2 py-2" aria-label="Diagnostic filters">
        <label class="flex items-center gap-2 text-gray-700">
            <span class="w-12">Severity</span>
            <select
                bind:value={selectedLevel}
                class="min-w-0 flex-1 rounded border border-gray-300 bg-white px-1 py-1"
            >
                <option value="all">All levels</option>
                <option value="warn">Warnings</option>
                <option value="error">Errors</option>
                <option value="info">Info</option>
            </select>
        </label>
        <label class="flex items-center gap-2 text-gray-700">
            <span class="w-12">Find</span>
            <input
                type="search"
                bind:value={searchText}
                class="min-w-0 flex-1 rounded border border-gray-300 px-1 py-1"
                placeholder="body name or text"
                aria-label="Filter diagnostics by body name or text"
            />
        </label>
        {#if selectedLevel !== 'all' || searchText}
            <button type="button" class="text-blue-700 underline" on:click={clearFilters}
                >Clear filters</button
            >
        {/if}
    </div>

    <details bind:open={showRawEvidence} class="border-b border-gray-200">
        <summary class="cursor-pointer px-2 py-2 font-medium text-gray-700"
            >Inspect raw evidence ({filteredEntries.length})</summary
        >
        <div
            bind:this={logContainer}
            class="max-h-56 overflow-y-auto break-words p-2 font-mono"
            aria-label="Newest first raw robot run diagnostics"
        >
            {#if $runLogStore.length === 0}
                <p class="text-gray-500">Run the robot to capture diagnostics.</p>
            {:else if visibleEntries.length === 0}
                <p class="text-gray-500">No diagnostics match these filters.</p>
            {:else}
                {#each visibleEntries as entry (entry.id)}
                    <p class={levelClasses[entry.level]}>
                        <span class="text-gray-500">[{entry.timestamp}]</span>
                        <span class="font-semibold">{entry.level.toUpperCase()}</span>
                        {entry.message}
                    </p>
                {/each}
            {/if}
        </div>
    </details>

    {#if $runLogStore.length === 0}
        <p class="p-2 text-gray-500">Run the robot to capture diagnostics.</p>
    {:else}
        <p class="px-2 py-1 text-[11px] text-gray-500">
            Newest evidence appears first. {filteredEntries.length} of {$runLogStore.length} entries
            shown.
        </p>
    {/if}
</section>
