import { describe, expect, it } from 'vitest';
import { M03_FLIP_THE_ROCK_OBSERVATION_CONTRACT } from '$lib/fll/m03-flip-the-rock-observation-contract';

describe('M03 Flip the Rock observation contract', () => {
    it('records the two official end-of-match observables', () => {
        const contract = M03_FLIP_THE_ROCK_OBSERVATION_CONTRACT;

        expect(contract.evaluation.kind).toBe('official-end-of-match');
        expect(contract.observations.researchFlagDown).toMatchObject({
            required: true,
            type: 'boolean'
        });
        expect(contract.observations.rockReturnedToOriginalPosition).toMatchObject({
            required: true,
            type: 'boolean',
            dependency: 'Only evaluate this bonus condition when researchFlagDown is true.'
        });
    });

    it('records source-backed point values without adding physics inputs', () => {
        const contract = M03_FLIP_THE_ROCK_OBSERVATION_CONTRACT;

        expect(contract.scoring.status).toBe('source-backed');
        expect(contract.scoring.conditions.map(({ points }) => points)).toEqual([20, 10]);
        expect(contract.scoring.unverified).toContain('Stable model identities');
        expect(contract.reset.unresolved).toBe(true);
    });
});
