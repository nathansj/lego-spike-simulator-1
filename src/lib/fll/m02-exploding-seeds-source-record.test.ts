import { describe, expect, it } from 'vitest';
import { M02_EXPLODING_SEEDS_SOURCE_RECORD } from '$lib/fll/m02-exploding-seeds-source-record';

describe('M02 Exploding Seeds source record', () => {
    it('pins the current Founders Edition authority set and exact mission locators', () => {
        const record = M02_EXPLODING_SEEDS_SOURCE_RECORD;

        expect(record.mission).toEqual({
            id: 'M02',
            name: 'Exploding Seeds',
            edition: 'BIOGLOW Founders Edition Challenge 2026-27'
        });
        expect(record.verifiedOn).toBe('2026-09-11');
        expect(Object.values(record.sources)).toHaveLength(5);
        for (const source of Object.values(record.sources)) {
            expect(new URL(source.url).protocol).toBe('https:');
            expect(source.locator.length).toBeGreaterThan(0);
            expect(source.revision.length).toBeGreaterThan(0);
            expect(source.supports.length).toBeGreaterThan(0);
        }
        expect(record.sources.rulebook.locator).toBe('page 9, Mission 02: Exploding Seeds');
        expect(record.sources.scoresheet.locator).toBe('page 1, MISSION 02 EXPLODING SEEDS');
        expect(record.sources.challengeUpdates.revision).toBe('Update 01, 2026-09-02');
    });

    it('records only the directly supported M02 scoring, timing, and equipment facts', () => {
        const rules = M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules;

        expect(rules.scoring).toEqual({
            condition: 'Seeds no longer touching the stalk.',
            points: 10,
            awardUnit: 'each qualifying seed',
            source: 'rulebook page 9, Mission 02: Exploding Seeds'
        });
        expect(rules.scoredSeedCount).toEqual({
            count: 3,
            source: 'software scoresheet page 1, MISSION 02 EXPLODING SEEDS choices 0, 1, 2, and 3'
        });
        expect(rules.evaluationTiming).toMatchObject({
            timing: 'end of the 2.5-minute match',
            visibility: 'Mission requirements must be visibly met.'
        });
        expect(rules.equipmentConstraint.applies).toBe(false);
    });

    it('leaves every simulator-specific geometry and mechanics dependency unresolved', () => {
        const unresolved = M02_EXPLODING_SEEDS_SOURCE_RECORD.unresolvedInputs;

        expect(unresolved).toHaveLength(6);
        expect(unresolved.every(({ status }) => status === 'unresolved')).toBe(true);
        expect(unresolved.every(({ missing }) => missing.length > 0)).toBe(true);
        expect(unresolved.map(({ id }) => id)).toEqual(
            expect.arrayContaining([
                'model-geometry-and-placement',
                'release-mechanics',
                'touch-boundary-and-referee-judgment'
            ])
        );
    });
});
