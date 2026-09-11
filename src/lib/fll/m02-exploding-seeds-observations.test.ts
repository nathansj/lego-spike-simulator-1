import { describe, expect, it } from 'vitest';
import {
    M02ExplodingSeedsObservationUnavailableError,
    observeM02ExplodingSeeds
} from '$lib/fll/m02-exploding-seeds-observations';

describe('M02 Exploding Seeds observation boundary', () => {
    it('preserves three explicit caller-supplied identities and contact booleans', () => {
        const observation = observeM02ExplodingSeeds([
            { seedId: 'seed-left', isTouchingStalk: true },
            { seedId: 'seed-center', isTouchingStalk: false },
            { seedId: 'seed-right', isTouchingStalk: false }
        ]);

        expect(observation).toEqual({
            seedStalkTouchAtEnd: [
                { seedId: 'seed-left', isTouchingStalk: true },
                { seedId: 'seed-center', isTouchingStalk: false },
                { seedId: 'seed-right', isTouchingStalk: false }
            ]
        });
    });

    it('fails closed when fewer than three seed observations are supplied', () => {
        expect(() =>
            observeM02ExplodingSeeds([
                { seedId: 'seed-left', isTouchingStalk: true },
                { seedId: 'seed-center', isTouchingStalk: false }
            ])
        ).toThrowError(
            expect.objectContaining({
                name: 'M02ExplodingSeedsObservationUnavailableError',
                evidence: {
                    status: 'unavailable',
                    reason: 'invalid-seed-contact-input',
                    expectedSeedCount: 3,
                    receivedSeedCount: 2,
                    missingSeedIndexes: [2],
                    invalidSeedIdentityIndexes: [],
                    duplicateSeedIds: [],
                    invalidContactBooleanIndexes: []
                }
            })
        );
    });

    it('fails closed when seed identities are empty or duplicated', () => {
        expect(() =>
            observeM02ExplodingSeeds([
                { seedId: 'seed-left', isTouchingStalk: true },
                { seedId: ' ', isTouchingStalk: false },
                { seedId: 'seed-left', isTouchingStalk: false }
            ])
        ).toThrowError(
            expect.objectContaining({
                evidence: expect.objectContaining({
                    invalidSeedIdentityIndexes: [1],
                    duplicateSeedIds: ['seed-left']
                })
            })
        );
    });

    it('fails closed when a contact value is not a boolean at runtime', () => {
        expect(() =>
            observeM02ExplodingSeeds([
                { seedId: 'seed-left', isTouchingStalk: true },
                { seedId: 'seed-center', isTouchingStalk: undefined },
                { seedId: 'seed-right', isTouchingStalk: false }
            ] as unknown as Parameters<typeof observeM02ExplodingSeeds>[0])
        ).toThrowError(
            expect.objectContaining({
                evidence: expect.objectContaining({
                    invalidContactBooleanIndexes: [1]
                })
            })
        );
    });

    it('reports structured evidence through the typed unavailable error', () => {
        let thrown: unknown;
        try {
            observeM02ExplodingSeeds([]);
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(M02ExplodingSeedsObservationUnavailableError);
        expect(thrown).toMatchObject({
            evidence: {
                status: 'unavailable',
                reason: 'invalid-seed-contact-input',
                expectedSeedCount: 3,
                receivedSeedCount: 0,
                missingSeedIndexes: [0, 1, 2]
            }
        });
    });
});
