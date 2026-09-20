<script lang="ts">
    import type { SeasonMission, SeasonPackage } from '$lib/fll/season-package';
    import { missionReadiness } from '$lib/fll/season-readiness';

    export let seasonPackage: SeasonPackage | undefined = undefined;
    export let selectedMissionId = '';

    $: mission = seasonPackage?.missions.find(({ id }) => id === selectedMissionId) ?? seasonPackage?.missions[0];
    $: readiness = mission ? missionReadiness(mission) : undefined;

    function levelClass(level: NonNullable<typeof readiness>['level']): string {
        if (level === 'ready') return 'border-green-300 bg-green-50 text-green-900';
        if (level === 'practice-only') return 'border-amber-300 bg-amber-50 text-amber-950';
        return 'border-slate-300 bg-slate-100 text-slate-900';
    }

    function capabilityClass(status: string): string {
        if (status === 'verified' || status === 'implemented' || status === 'calibrated') {
            return 'border-green-300 bg-green-50 text-green-800';
        }
        if (status === 'partial' || status === 'unverified' || status === 'located') {
            return 'border-amber-300 bg-amber-50 text-amber-900';
        }
        return 'border-slate-300 bg-slate-100 text-slate-700';
    }
</script>

<section class="border-b border-slate-200 bg-slate-50 px-4 py-3" aria-labelledby="mission-readiness-title">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Mission</p>
            <h2 id="mission-readiness-title" class="text-base font-semibold text-slate-900">
                Mission readiness
            </h2>
        </div>
        {#if seasonPackage}
            <label class="flex min-w-[18rem] flex-col gap-1 text-sm font-medium text-slate-800">
                <span>Mission to inspect</span>
                <select class="rounded border border-slate-300 bg-white px-3 py-2" bind:value={selectedMissionId}>
                    {#each seasonPackage.missions as missionOption}
                        <option value={missionOption.id}>{missionOption.id} · {missionOption.name}</option>
                    {/each}
                </select>
            </label>
        {/if}
    </div>

    {#if mission && readiness}
        <div class="mt-3 rounded border p-3 {levelClass(readiness.level)}">
            <p class="font-semibold">{mission.id} · {mission.name}: {readiness.headline}</p>
            <p class="mt-1 text-sm">{readiness.explanation}</p>
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
                {#each readiness.capabilities as capability}
                    <div class="rounded border bg-white/70 p-2 text-xs">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <span class="font-semibold">{capability.label}</span>
                            <span class="rounded border px-2 py-0.5 {capabilityClass(capability.status)}">
                                {capability.statusLabel}
                            </span>
                        </div>
                        <p class="mt-1">Next: {capability.action}</p>
                    </div>
                {/each}
            </div>
        </div>
    {:else}
        <p class="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Choose a season package to see mission readiness and corrective actions.
        </p>
    {/if}
</section>
