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

    it('does not invent point values or physics inputs', () => {
        const contract = M03_FLIP_THE_ROCK_OBSERVATION_CONTRACT;

        expect(contract.scoring.status).toBe('point-values-unresolved');
        expect(contract.scoring.conditions).toHaveLength(2);
        expect(contract.scoring.unverified).toContain('Point values');
        expect(contract.reset.unresolved).toBe(true);
    });
});
