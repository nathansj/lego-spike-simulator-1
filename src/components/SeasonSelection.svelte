<script lang="ts">
    import type { SeasonPackage, SeasonPackageCapabilityStatus } from '$lib/fll/season-package';
    import { createEventDispatcher } from 'svelte';

    export let packages: readonly SeasonPackage[] = [];
    export let selectedId = '';
    export let selectedPackage: SeasonPackage | undefined = undefined;

    const dispatch = createEventDispatcher<{ select: string }>();

    const capabilityLabels = {
        assets: 'Mission assets',
        mechanics: 'Mechanics',
        scoring: 'Scoring',
        physicalCalibration: 'Physical calibration'
    } as const;
    const capabilityKeys = Object.keys(capabilityLabels) as (keyof typeof capabilityLabels)[];

    function capabilityStatus(
        key: keyof typeof capabilityLabels
    ): { status: SeasonPackageCapabilityStatus; detail: string } {
        if (!selectedPackage) return { status: 'unavailable', detail: 'No season selected.' };
        const statuses = selectedPackage.missions.map((mission) =>
            key === 'physicalCalibration'
                ? mission.capabilities.physicalCalibration
                : mission.capabilities[key]
        );
        const complete = statuses.filter(
            (status) => status === 'verified' || status === 'implemented' || status === 'calibrated'
        ).length;
        const status = complete === statuses.length ? statuses[0] : complete === 0 ? statuses[0] : 'partial';
        return {
            status,
            detail: `${complete} of ${statuses.length} missions marked complete`
        };
    }

    function statusClass(status: SeasonPackageCapabilityStatus): string {
        if (status === 'verified' || status === 'implemented' || status === 'calibrated') {
            return 'border-green-300 bg-green-50 text-green-800';
        }
        if (status === 'partial' || status === 'unverified' || status === 'located') {
            return 'border-amber-300 bg-amber-50 text-amber-900';
        }
        return 'border-slate-300 bg-slate-100 text-slate-700';
    }

    function statusLabel(status: SeasonPackageCapabilityStatus): string {
        switch (status) {
            case 'verified':
                return 'Verified';
            case 'implemented':
                return 'Implemented';
            case 'calibrated':
                return 'Calibrated';
            case 'partial':
                return 'Partial';
            case 'located':
                return 'References found';
            case 'unverified':
                return 'Unverified';
            case 'unavailable':
                return 'Unavailable';
            case 'not-implemented':
                return 'Not implemented';
        }
    }

    function capabilityCardClass(key: keyof typeof capabilityLabels): string {
        return `rounded border bg-white p-2 text-xs ${statusClass(capabilityStatus(key).status)}`;
    }
</script>

<section class="border-b border-slate-200 bg-white px-4 py-3" aria-labelledby="season-selection-title">
    <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Season</p>
            <h2 id="season-selection-title" class="text-base font-semibold text-slate-900">
                Choose the challenge you are practicing
            </h2>
        </div>
        <label class="flex min-w-[18rem] flex-col gap-1 text-sm font-medium text-slate-800">
            <span>Challenge package</span>
            <select
                class="rounded border border-slate-300 bg-white px-3 py-2"
                value={selectedId}
                on:change={(event) => dispatch('select', event.currentTarget.value)}
                aria-describedby="season-selection-help"
            >
                <option value="">Choose a season</option>
                {#each packages as seasonPackage}
                    <option value={seasonPackage.id}>{seasonPackage.name}</option>
                {/each}
            </select>
        </label>
    </div>

    <p id="season-selection-help" class="mt-2 text-sm text-slate-600">
        The package selects season identity and evidence. It does not replace your current scene.
    </p>

    {#if selectedPackage}
        <div class="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p class="font-semibold text-slate-900">{selectedPackage.name}</p>
                    <p class="text-sm text-slate-700">
                        {selectedPackage.edition} · {selectedPackage.platform} · revision {selectedPackage.revision}
                    </p>
                    <p class="text-xs text-slate-600">
                        Package sources verified {selectedPackage.provenance.verifiedOn}.
                    </p>
                </div>
                <span class="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700">
                    {selectedPackage.missions.length} missions
                </span>
            </div>

            <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {#each capabilityKeys as key}
                    <div
                        class={capabilityCardClass(key)}
                    >
                        <p class="font-semibold">{capabilityLabels[key]}</p>
                        <p>
                            {statusLabel(capabilityStatus(key).status)} ·
                            {capabilityStatus(key).detail}
                        </p>
                    </div>
                {/each}
            </div>

            <details class="mt-3 rounded border border-slate-200 bg-white">
                <summary class="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-800">
                    Sources and evidence limits
                </summary>
                <ul class="space-y-1 border-t border-slate-200 px-3 py-2 text-xs text-slate-700">
                    {#each selectedPackage.provenance.sources as source}
                        <li>
                            <a class="text-sky-800 underline" href={source.url} target="_blank" rel="noreferrer">
                                {source.title}
                            </a>
                            · {source.revision}; checked {source.verifiedOn}
                        </li>
                    {/each}
                </ul>
                <p class="border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
                    Package evidence is not proof of official scoring, physical calibration, or real-world accuracy.
                </p>
            </details>
        </div>
    {:else}
        <p class="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Choose a season package before running a practice program.
        </p>
    {/if}
</section>
