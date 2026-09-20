<script lang="ts">
    import { createEventDispatcher } from 'svelte';
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

    const dispatch = createEventDispatcher<{
        robot: void;
        drive: void;
        field: void;
        program: void;
        season: void;
    }>();

    $: readiness = {
        seasonReady,
        fieldReady,
        robotReady,
        driveReady,
        programReady
    } satisfies PracticeRunReadiness;
    $: ready = isPracticeRunReady(readiness);
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
        <h1 id="practice-title" class="text-lg font-semibold text-slate-900">
            Build, run, and improve your robot
        </h1>
    </div>

    <div class="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
            <p class="text-sm font-medium text-slate-900">{missionLabel}</p>
            <p class="text-sm text-slate-600">
                {seasonLabel}{missionCount > 0 ? ` · ${missionCount} missions` : ''}
            </p>
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
