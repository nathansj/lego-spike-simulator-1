import { describe, expect, it, vi } from 'vitest';
import type { M02GlobalMatchEligibility } from '$lib/fll/exploding-seeds';
import {
    evaluateM02ExplodingSeedsAtMatchEnd,
    type M02ExplodingSeedsMissionResultInput
} from '$lib/fll/m02-exploding-seeds-mission-result';

interface TestObservationGeometry {
    seedContacts: readonly [boolean, boolean, boolean];
}

const eligibleMatch: M02GlobalMatchEligibility = {
    allowsMissionPoints: true,
    reasons: []
};

function input(
    seedContacts: readonly [boolean, boolean, boolean]
): M02ExplodingSeedsMissionResultInput<TestObservationGeometry> {
    return {
        observationGeometry: { seedContacts },
        observeSeedStalkTouchAtEnd: ({ seedContacts: contacts }) => [
            { seedId: 'seed-left', isTouchingStalk: contacts[0] },
            { seedId: 'seed-center', isTouchingStalk: contacts[1] },
            { seedId: 'seed-right', isTouchingStalk: contacts[2] }
        ],
        globalMatchEligibility: eligibleMatch
    };
}

describe('M02 Exploding Seeds mission result composition', () => {
    it('passes explicit geometry through the observation boundary into the pure scorer', () => {
        const missionInput = input([false, true, false]);
        const observeSeedStalkTouchAtEnd = vi.fn(missionInput.observeSeedStalkTouchAtEnd);

        const result = evaluateM02ExplodingSeedsAtMatchEnd({
            ...missionInput,
            observeSeedStalkTouchAtEnd
        });

        expect(observeSeedStalkTouchAtEnd).toHaveBeenCalledOnce();
        expect(observeSeedStalkTouchAtEnd).toHaveBeenCalledWith(missionInput.observationGeometry);
        expect(result).toMatchObject({
            missionId: 'M02',
            status: 'scored',
            observation: {
                seedStalkTouchAtEnd: [
                    { seedId: 'seed-left', isTouchingStalk: false },
                    { seedId: 'seed-center', isTouchingStalk: true },
                    { seedId: 'seed-right', isTouchingStalk: false }
                ]
            },
            score: {
                points: 20
            }
        });
    });

    it('preserves explicit ineligibility as an adjudicated zero-point score', () => {
        const result = evaluateM02ExplodingSeedsAtMatchEnd({
            ...input([false, false, false]),
            globalMatchEligibility: {
                allowsMissionPoints: false,
                reasons: ['The external match adjudicator disallowed these mission points.']
            }
        });

        expect(result).toMatchObject({
            status: 'scored',
            score: {
                points: 0,
                globalMatchEligibility: {
                    allowsMissionPoints: false,
                    reasons: ['The external match adjudicator disallowed these mission points.']
                }
            }
        });
    });

    it('fails closed before observation when geometry is unavailable', () => {
        const observeSeedStalkTouchAtEnd = vi.fn();

        const result = evaluateM02ExplodingSeedsAtMatchEnd({
            observationGeometry: undefined,
            observeSeedStalkTouchAtEnd,
            globalMatchEligibility: eligibleMatch
        });

        expect(observeSeedStalkTouchAtEnd).not.toHaveBeenCalled();
        expect(result).toEqual({
            missionId: 'M02',
            status: 'unavailable',
            evidence: {
                status: 'unavailable',
                reason: 'observation-geometry-unavailable'
            }
        });
    });

    it('fails closed when the observation adapter is unavailable at runtime', () => {
        const missionInput = input([false, false, false]);

        const result = evaluateM02ExplodingSeedsAtMatchEnd({
            ...missionInput,
            observeSeedStalkTouchAtEnd: undefined
        } as unknown as M02ExplodingSeedsMissionResultInput<TestObservationGeometry>);

        expect(result).toEqual({
            missionId: 'M02',
            status: 'unavailable',
            evidence: {
                status: 'unavailable',
                reason: 'observation-adapter-unavailable'
            }
        });
    });

    it('returns structured unavailability for invalid observed seed contacts', () => {
        const result = evaluateM02ExplodingSeedsAtMatchEnd({
            ...input([false, false, false]),
            observeSeedStalkTouchAtEnd: () => [
                { seedId: 'seed-left', isTouchingStalk: false },
                { seedId: 'seed-left', isTouchingStalk: false }
            ]
        });

        expect(result).toMatchObject({
            missionId: 'M02',
            status: 'unavailable',
            evidence: {
                status: 'unavailable',
                reason: 'observation-unavailable',
                observation: {
                    status: 'unavailable',
                    reason: 'invalid-seed-contact-input',
                    expectedSeedCount: 3,
                    receivedSeedCount: 2,
                    missingSeedIndexes: [2],
                    duplicateSeedIds: ['seed-left']
                }
            }
        });
    });

    it('fails closed when global match eligibility is missing or malformed', () => {
        const missingEligibility = evaluateM02ExplodingSeedsAtMatchEnd({
            ...input([false, false, false]),
            globalMatchEligibility: undefined
        } as unknown as M02ExplodingSeedsMissionResultInput<TestObservationGeometry>);
        const malformedEligibility = evaluateM02ExplodingSeedsAtMatchEnd({
            ...input([false, false, false]),
            globalMatchEligibility: {
                allowsMissionPoints: false,
                reasons: []
            }
        });

        expect(missingEligibility).toMatchObject({
            status: 'unavailable',
            evidence: {
                reason: 'global-match-eligibility-unavailable',
                message: 'M02 global match eligibility is required.'
            }
        });
        expect(malformedEligibility).toMatchObject({
            status: 'unavailable',
            evidence: {
                reason: 'global-match-eligibility-unavailable',
                message: expect.stringContaining(
                    'globalMatchEligibility.reasons must explain an ineligible result'
                )
            }
        });
    });

    it('does not mask unexpected observation adapter failures', () => {
        const unexpectedError = new Error('adapter implementation defect');

        expect(() =>
            evaluateM02ExplodingSeedsAtMatchEnd({
                ...input([false, false, false]),
                observeSeedStalkTouchAtEnd: () => {
                    throw unexpectedError;
                }
            })
        ).toThrow(unexpectedError);
    });
});
