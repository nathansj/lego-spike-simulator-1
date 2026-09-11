<script lang="ts">
    import type { DroneSurveyScore } from '$lib/fll/drone-survey';

    export let score: DroneSurveyScore | undefined;
    export let observationGeometryAvailable = false;
</script>

<section
    class="border border-gray-300 rounded bg-white p-3 text-sm"
    aria-labelledby="drone-survey-score-heading"
>
    <h2 id="drone-survey-score-heading" class="text-base font-semibold">M01 Drone Survey</h2>

    {#if score}
        <p class="mt-2" aria-live="polite"><strong>Score: {score.points} points</strong></p>
        <ul class="mt-2 space-y-2" aria-label="M01 scoring conditions">
            {#each score.conditions as condition}
                <li class="border-l-4 border-gray-300 pl-2">
                    <p>
                        <strong>{condition.awarded ? 'Awarded' : 'Not awarded'}:</strong>
                        {condition.points} points
                    </p>
                    <p>{condition.explanation}</p>
                </li>
            {/each}
        </ul>
        <p class="mt-3">
            <a href={score.source.rulebook.url} target="_blank" rel="noreferrer">
                View scoring source (Rulebook p. {score.source.rulebook.page})
            </a>
        </p>
    {:else}
        <p class="mt-2" role="status">
            {#if observationGeometryAvailable}
                M01 score feedback is unavailable until the match is finished.
            {:else}
                M01 score feedback is unavailable because calibrated observation geometry is not
                configured.
            {/if}
        </p>
    {/if}
</section>
