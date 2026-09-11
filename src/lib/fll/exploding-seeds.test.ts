import { describe, expect, it } from 'vitest';
import {
    ExplodingSeedsInputValidationError,
    scoreExplodingSeeds,
    type ExplodingSeedsObservation,
    type M02GlobalMatchEligibility
} from '$lib/fll/exploding-seeds';
import { M02_EXPLODING_SEEDS_SOURCE_RECORD } from '$lib/fll/m02-exploding-seeds-source-record';

const eligibleMatch: M02GlobalMatchEligibility = {
    allowsMissionPoints: true,
    reasons: []
};

function observation(contacts: readonly [boolean, boolean, boolean]): ExplodingSeedsObservation {
    const [firstSeedTouchingStalk, secondSeedTouchingStalk, thirdSeedTouchingStalk] = contacts;

    return {
        seeds: [
            { seedId: 'seed-1', isTouchingStalk: firstSeedTouchingStalk },
            { seedId: 'seed-2', isTouchingStalk: secondSeedTouchingStalk },
            { seedId: 'seed-3', isTouchingStalk: thirdSeedTouchingStalk }
        ]
    };
}

describe('Exploding Seeds scoring', () => {
    it('awards 10 points for each of exactly three seeds no longer touching the stalk', () => {
        const result = scoreExplodingSeeds(observation([false, false, false]), eligibleMatch);

        expect(result).toMatchObject({
            missionId: 'M02',
            points: 30,
            source: M02_EXPLODING_SEEDS_SOURCE_RECORD
        });
        expect(result.conditions).toEqual([
            expect.objectContaining({
                seedId: 'seed-1',
                points: 10,
                qualifies: true,
                awarded: true
            }),
            expect.objectContaining({
                seedId: 'seed-2',
                points: 10,
                qualifies: true,
                awarded: true
            }),
            expect.objectContaining({
                seedId: 'seed-3',
                points: 10,
                qualifies: true,
                awarded: true
            })
        ]);
    });

    it('awards points only for seeds no longer touching the stalk', () => {
        const result = scoreExplodingSeeds(observation([false, true, false]), eligibleMatch);

        expect(result.points).toBe(20);
        expect(result.conditions.map(({ qualifies, awarded }) => ({ qualifies, awarded }))).toEqual(
            [
                { qualifies: true, awarded: true },
                { qualifies: false, awarded: false },
                { qualifies: true, awarded: true }
            ]
        );
    });

    it('returns zero points when general match eligibility disallows mission points', () => {
        const eligibility: M02GlobalMatchEligibility = {
            allowsMissionPoints: false,
            reasons: ['The match adjudicator invalidated the attempted mission points.']
        };

        const result = scoreExplodingSeeds(observation([false, false, false]), eligibility);

        expect(result.points).toBe(0);
        expect(result.conditions.every(({ qualifies }) => qualifies)).toBe(true);
        expect(result.conditions.every(({ awarded }) => !awarded)).toBe(true);
    });

    it.each([
        [{ seeds: [{ seedId: 'seed-1', isTouchingStalk: false }] }, eligibleMatch],
        [
            {
                seeds: [
                    { seedId: 'seed-1', isTouchingStalk: false },
                    { seedId: 'seed-1', isTouchingStalk: false },
                    { seedId: 'seed-3', isTouchingStalk: false }
                ]
            },
            eligibleMatch
        ],
        [
            {
                seeds: [
                    { seedId: 'seed-1', isTouchingStalk: false },
                    { seedId: 'seed-2', isTouchingStalk: 'false' },
                    { seedId: 'seed-3', isTouchingStalk: false }
                ]
            },
            eligibleMatch
        ],
        [observation([false, false, false]), { allowsMissionPoints: false, reasons: [] }]
    ])(
        'rejects malformed observation or eligibility input',
        (invalidObservation, invalidEligibility) => {
            expect(() =>
                scoreExplodingSeeds(
                    invalidObservation as ExplodingSeedsObservation,
                    invalidEligibility as M02GlobalMatchEligibility
                )
            ).toThrow(ExplodingSeedsInputValidationError);
        }
    );
});
