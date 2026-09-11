<script lang="ts">
    import {
        BIOGLOW_CATALOG_VERIFIED_ON,
        BIOGLOW_FOUNDERS_EDITION,
        BIOGLOW_MISSION_CATALOG,
        type MissionSource,
        type ReadinessStatus
    } from '$lib/fll/bioglow-mission-catalog';

    function statusLabel(status: ReadinessStatus): string {
        switch (status) {
            case 'implemented':
                return 'Implemented';
            case 'not-implemented':
                return 'No scorer';
            case 'verified':
                return 'Present';
            case 'located':
                return 'References found';
            case 'unverified':
                return 'Unverified';
            case 'unavailable':
                return 'Unavailable';
        }
    }

    function statusClass(status: ReadinessStatus): string {
        switch (status) {
            case 'implemented':
            case 'verified':
            case 'located':
                return 'border-sky-300 bg-sky-50 text-sky-800';
            case 'unverified':
                return 'border-amber-300 bg-amber-50 text-amber-900';
            case 'unavailable':
            case 'not-implemented':
                return 'border-gray-300 bg-gray-100 text-gray-700';
        }
    }

    function sourceLabel(source: MissionSource): string {
        if (source.title.includes('Scoresheet')) return 'Scoresheet';
        if (source.title.includes('Rulebook')) return 'Rulebook';
        if (source.title.includes('Updates')) return 'Updates';
        return 'Mission index';
    }
</script>

<section class="border-b border-sky-200 bg-sky-50" aria-labelledby="bioglow-readiness-heading">
    <details>
        <summary
            id="bioglow-readiness-heading"
            class="cursor-pointer px-3 py-2 text-sm font-semibold text-sky-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-inset"
        >
            BIOGLOW mission readiness (15 missions)
        </summary>

        <div class="border-t border-sky-200 px-3 py-3 text-sm">
            <p class="text-sky-950">
                {BIOGLOW_FOUNDERS_EDITION}. Listed mission references checked {BIOGLOW_CATALOG_VERIFIED_ON}; rulebook coverage varies by mission.
            </p>
            <p class="mt-1 text-xs text-sky-900">
                Readiness describes this simulator checkout, not real-world field calibration or official-scoring certification.
            </p>

            <div class="mt-3 overflow-x-auto rounded border border-sky-200 bg-white">
                <table class="w-full min-w-[48rem] text-left text-xs">
                    <caption class="sr-only">
                        BIOGLOW mission scoring, mechanics, asset readiness, and supporting references
                    </caption>
                    <thead class="bg-sky-100 text-sky-950">
                        <tr>
                            <th scope="col" class="px-3 py-2 font-semibold">Mission</th>
                            <th scope="col" class="px-3 py-2 font-semibold">Scoring</th>
                            <th scope="col" class="px-3 py-2 font-semibold">Mechanics</th>
                            <th scope="col" class="px-3 py-2 font-semibold">Assets</th>
                            <th scope="col" class="px-3 py-2 font-semibold">References</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        {#each BIOGLOW_MISSION_CATALOG as mission}
                            <tr class="align-top">
                                <th
                                    scope="row"
                                    class="whitespace-nowrap px-3 py-2 font-medium text-gray-900"
                                >
                                    {mission.id} {mission.name}
                                </th>
                                <td class="px-3 py-2">
                                    <span
                                        class={`inline-flex rounded border px-2 py-0.5 font-medium ${statusClass(mission.readiness.scoring.status)}`}
                                    >
                                        {statusLabel(mission.readiness.scoring.status)}
                                    </span>
                                    <p class="mt-1 text-gray-600">{mission.readiness.scoring.detail}</p>
                                </td>
                                <td class="px-3 py-2">
                                    <span
                                        class={`inline-flex rounded border px-2 py-0.5 font-medium ${statusClass(mission.readiness.mechanics.status)}`}
                                    >
                                        {statusLabel(mission.readiness.mechanics.status)}
                                    </span>
                                    <p class="mt-1 text-gray-600">{mission.readiness.mechanics.detail}</p>
                                </td>
                                <td class="px-3 py-2">
                                    <span
                                        class={`inline-flex rounded border px-2 py-0.5 font-medium ${statusClass(mission.readiness.repositoryAssetPresence.status)}`}
                                    >
                                        {statusLabel(
                                            mission.readiness.repositoryAssetPresence.status
                                        )}
                                    </span>
                                    <p class="mt-1 text-gray-600">{mission.readiness.repositoryAssetPresence.detail}</p>
                                </td>
                                <td class="px-3 py-2">
                                    <ul
                                        class="space-y-1"
                                        aria-label={`${mission.id} supporting references`}
                                    >
                                        {#each mission.readiness.officialRuleSourceCoverage.sources as source}
                                            <li>
                                                <a
                                                    class="text-sky-800 underline hover:text-sky-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-700"
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {sourceLabel(source)}
                                                </a>
                                                <p class="text-gray-600">{source.locator}; checked {source.verifiedOn}</p>
                                            </li>
                                        {/each}
                                    </ul>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </details>
</section>
