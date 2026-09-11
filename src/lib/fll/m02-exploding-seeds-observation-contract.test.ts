import { describe, expect, it } from 'vitest';
import { M02_EXPLODING_SEEDS_OBSERVATION_CONTRACT } from '$lib/fll/m02-exploding-seeds-observation-contract';
import { M02_EXPLODING_SEEDS_SOURCE_RECORD } from '$lib/fll/m02-exploding-seeds-source-record';

describe('M02 Exploding Seeds observation contract', () => {
    it('requires an end-of-match contact result for each official scored seed', () => {
        const contract = M02_EXPLODING_SEEDS_OBSERVATION_CONTRACT;

        expect(contract.evaluation).toMatchObject({
            kind: 'official-end-of-match',
            when: 'After the 2.5-minute match ends and before scoring is recorded.',
            requirement: 'Each scored condition must be visibly met at that time.'
        });
        expect(contract.evaluation.livePracticeFeedback).toEqual({
            permitted: true,
            officialEquivalent: false,
            reason: 'The official source defines scoring at match end; intermediate feedback is not an official score.'
        });
        expect(contract.observations.seedStalkTouchAtEnd).toMatchObject({
            required: true,
            expectedSeedCount: 3,
            cardinality: 'exactly one boolean result for each official scored seed',
            qualification: 'A seed qualifies only when isTouchingStalk is false.'
        });
    });

    it('exposes the sole source-backed point condition without an M02 equipment-contact disqualifier', () => {
        const contract = M02_EXPLODING_SEEDS_OBSERVATION_CONTRACT;

        expect(contract.scoring.conditions).toEqual([
            {
                id: 'seed-no-longer-touching-stalk',
                observable: 'seedStalkTouchAtEnd.isTouchingStalk === false',
                points: 10,
                awardUnit: 'each qualifying seed',
                source: 'rulebook page 9, Mission 02: Exploding Seeds'
            }
        ]);
        expect(contract.equipmentConstraints.missionSpecificNoEquipmentConstraint).toEqual({
            applies: false,
            effect: 'Do not require an M02 mission-model-versus-equipment contact observation solely for the No Equipment Constraint rule.',
            source: M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.equipmentConstraint.source
        });
        expect(contract.equipmentConstraints.generalEquipmentRules.status).toBe(
            'external-required'
        );
    });

    it('does not represent unresolved simulator inputs as an executable score', () => {
        const contract = M02_EXPLODING_SEEDS_OBSERVATION_CONTRACT;

        expect(contract.scoring.unverified).toContain('No executable scorer is provided');
        expect(contract.reset).toMatchObject({ required: true, unresolved: true });
        expect(contract.unresolvedInputs).toBe(M02_EXPLODING_SEEDS_SOURCE_RECORD.unresolvedInputs);
    });
});
