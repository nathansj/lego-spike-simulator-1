<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { Button } from 'flowbite-svelte';
    import {
        CloseOutline,
        FloppyDiskOutline,
        PlayOutline,
        StopOutline,
        ToolsOutline
    } from 'flowbite-svelte-icons';
    import { isPracticeRunReady, type PracticeRunReadiness } from '$lib/fll/practice-run-gate';

    export let runSimulation = false;
    export let robotReady = false;
    export let driveReady = false;
    export let programReady = false;
    export let seasonReady = false;
    export let fieldReady = true;
    export let seasonLabel = 'No season selected';
    export let missionLabel = 'No mission selected';
    export let missionCount = 0;
    export let workspaceMode: 'practice' | 'expert' | 'diagnostics' = 'practice';
    export let canClose = false;

    const dispatch = createEventDispatcher<{
        robot: void;
        drive: void;
        field: void;
        program: void;
        run: void;
        stop: void;
        season: void;
        save: void;
        close: void;
        mode: 'practice' | 'expert' | 'diagnostics';
    }>();

    $: readiness = {
        seasonReady,
        fieldReady,
        robotReady,
        driveReady,
        programReady
    } satisfies PracticeRunReadiness;
    $: ready = isPracticeRunReady(readiness);
    $: runLabel = runSimulation ? 'Stop run' : !ready ? nextActionLabel() : 'Run program';
    $: nextSetupItem = [
        !seasonReady ? 'Season' : undefined,
        !fieldReady ? 'Field' : undefined,
        !robotReady ? 'Robot' : undefined,
        !driveReady ? 'Drive wheels' : undefined,
        !programReady ? 'Program' : undefined
    ].find((item) => item !== undefined);

    function statusLabel(value: boolean): string {
        return value ? 'Ready' : 'Needs setup';
    }

    function openNextSetupItem(): void {
        switch (nextSetupItem) {
            case 'Season':
                dispatch('season');
                break;
            case 'Field':
                dispatch('field');
                break;
            case 'Robot':
                dispatch('robot');
                break;
            case 'Drive wheels':
                dispatch('drive');
                break;
            case 'Program':
                dispatch('program');
                break;
        }
    }

    function nextActionLabel(): string {
        switch (nextSetupItem) {
            case 'Season':
                return 'Choose challenge';
            case 'Field':
                return 'Choose field';
            case 'Robot':
                return 'Choose robot';
            case 'Drive wheels':
                return 'Fix drive setup';
            case 'Program':
                return 'Open program';
            default:
                return 'Review setup';
        }
    }
</script>

<section class="border-b border-slate-200 bg-white px-4 py-3" aria-labelledby="practice-title">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-blue-700">Practice</p>
            <h1 id="practice-title" class="text-lg font-semibold text-slate-900">
                Build, run, and improve your robot
            </h1>
        </div>
        <div class="flex flex-wrap items-center gap-2" aria-label="Workspace navigation">
            <button
                type="button"
                class="rounded px-3 py-2 text-sm font-medium {workspaceMode === 'practice'
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-800 underline'}"
                aria-current={workspaceMode === 'practice' ? 'page' : undefined}
                on:click={() => dispatch('mode', 'practice')}
            >
                Practice
            </button>
            <button
                type="button"
                class="rounded px-3 py-2 text-sm font-medium {workspaceMode === 'expert'
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-800 underline'}"
                aria-current={workspaceMode === 'expert' ? 'page' : undefined}
                on:click={() => dispatch('mode', 'expert')}
            >
                Expert Setup
            </button>
            <button
                type="button"
                class="rounded px-3 py-2 text-sm font-medium {workspaceMode === 'diagnostics'
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-800 underline'}"
                aria-current={workspaceMode === 'diagnostics' ? 'page' : undefined}
                on:click={() => dispatch('mode', 'diagnostics')}
            >
                Developer Diagnostics
            </button>
            <Button
                color="light"
                size="sm"
                aria-label="Save project"
                title="Save project"
                on:click={() => dispatch('save')}
            >
                <FloppyDiskOutline size="sm" aria-hidden="true" />
            </Button>
            {#if canClose}
                <button
                    type="button"
                    class="icon-btn p-1 text-slate-600 hover:bg-slate-100"
                    aria-label="Close simulator"
                    title="Close simulator"
                    on:click={() => dispatch('close')}
                >
                    <CloseOutline size="sm" aria-hidden="true" />
                </button>
            {/if}
        </div>
    </div>

    <div class="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
            <p class="text-sm font-medium text-slate-900">{missionLabel}</p>
            <p class="text-sm text-slate-600">
                {seasonLabel}{missionCount > 0 ? ` · ${missionCount} missions` : ''}
            </p>
        </div>
        <div class="flex items-center gap-2" aria-label="Practice run controls">
            {#if runSimulation}
                <Button
                    color="red"
                    class="!px-4 !py-2 font-semibold"
                    aria-label={runLabel}
                    title={runLabel}
                    on:click={() => dispatch('stop')}
                >
                    <StopOutline size="md" aria-hidden="true" />
                </Button>
            {:else if !ready}
                <Button
                    color="light"
                    class="!px-4 !py-2 font-semibold"
                    on:click={openNextSetupItem}
                    aria-describedby="practice-setup-guidance"
                    aria-label={runLabel}
                    title={runLabel}
                >
                    <ToolsOutline size="md" aria-hidden="true" />
                </Button>
            {:else}
                <Button
                    color="green"
                    class="!px-4 !py-2 font-semibold"
                    on:click={() => dispatch('run')}
                    aria-describedby="practice-readiness"
                    aria-label={runLabel}
                    title={runLabel}
                >
                    <PlayOutline size="md" aria-hidden="true" />
                </Button>
            {/if}
        </div>
    </div>

    <div id="practice-readiness" class="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <span class="mr-1 text-sm font-medium text-slate-700">Ready to run:</span>
        <button
            type="button"
            class="rounded-full border px-3 py-1 text-sm {seasonReady
                ? 'border-green-300 bg-green-50 text-green-800'
                : 'border-amber-300 bg-amber-50 text-amber-900'}"
            on:click={() => dispatch('season')}
            aria-current={nextSetupItem === 'Season' ? 'step' : undefined}
            aria-label="Season: {statusLabel(seasonReady)}. Open season selection."
        >
            {seasonReady ? '✓' : '○'} Season
        </button>
        <button
            type="button"
            class="rounded-full border px-3 py-1 text-sm {fieldReady
                ? 'border-green-300 bg-green-50 text-green-800'
                : 'border-amber-300 bg-amber-50 text-amber-900'}"
            on:click={() => dispatch('field')}
            aria-current={nextSetupItem === 'Field' ? 'step' : undefined}
            aria-label="Field: {statusLabel(fieldReady)}. Open field setup."
        >
            {fieldReady ? '✓' : '○'} Field
        </button>
        <button
            type="button"
            class="rounded-full border px-3 py-1 text-sm {robotReady
                ? 'border-green-300 bg-green-50 text-green-800'
                : 'border-amber-300 bg-amber-50 text-amber-900'}"
            on:click={() => dispatch('robot')}
            aria-current={nextSetupItem === 'Robot' ? 'step' : undefined}
            aria-label="Robot: {statusLabel(robotReady)}. Open robot setup."
        >
            {robotReady ? '✓' : '○'} Robot
        </button>
        <button
            type="button"
            class="rounded-full border px-3 py-1 text-sm {driveReady
                ? 'border-green-300 bg-green-50 text-green-800'
                : 'border-amber-300 bg-amber-50 text-amber-900'}"
            on:click={() => dispatch('drive')}
            aria-current={nextSetupItem === 'Drive wheels' ? 'step' : undefined}
            aria-label="Drive wheels: {statusLabel(driveReady)}. Open drive setup."
        >
            {driveReady ? '✓' : '○'} Drive wheels
        </button>
        <button
            type="button"
            class="rounded-full border px-3 py-1 text-sm {programReady
                ? 'border-green-300 bg-green-50 text-green-800'
                : 'border-amber-300 bg-amber-50 text-amber-900'}"
            on:click={() => dispatch('program')}
            aria-current={nextSetupItem === 'Program' ? 'step' : undefined}
            aria-label="Program: {statusLabel(programReady)}. Open the code panel."
        >
            {programReady ? '✓' : '○'} Program
        </button>
    </div>

    {#if !ready && !runSimulation}
        <p id="practice-setup-guidance" class="mt-2 text-sm text-amber-800" role="status">
            Next setup: {nextSetupItem ?? 'complete the items above'}. Use {nextActionLabel()} to continue,
            or select a status item to review it.
        </p>
    {:else if !runSimulation}
        <p class="mt-2 text-sm text-green-800" role="status">
            Your table, robot, and program are ready.
        </p>
    {/if}

    {#if workspaceMode === 'expert'}
        <p
            class="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
        >
            <span class="font-semibold">Expert Setup</span> — change the field, robot, wheels, attachments,
            and saved setup.
        </p>
    {:else if workspaceMode === 'diagnostics'}
        <p
            class="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
        >
            <span class="font-semibold">Developer Diagnostics</span> — inspect run evidence, overlays,
            missing parts, and exports. Practice controls and essential run messages remain available.
        </p>
    {/if}
</section>
