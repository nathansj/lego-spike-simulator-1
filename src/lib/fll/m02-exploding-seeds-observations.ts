import { M02_EXPLODING_SEEDS_OBSERVATION_CONTRACT } from '$lib/fll/m02-exploding-seeds-observation-contract';

export interface M02SeedStalkTouchObservation {
    seedId: string;
    isTouchingStalk: boolean;
}

export interface M02ExplodingSeedsObservation {
    seedStalkTouchAtEnd: readonly M02SeedStalkTouchObservation[];
}

export interface M02ExplodingSeedsObservationUnavailableEvidence {
    status: 'unavailable';
    reason: 'invalid-seed-contact-input';
    expectedSeedCount: number;
    receivedSeedCount: number | null;
    missingSeedIndexes: number[];
    invalidSeedIdentityIndexes: number[];
    duplicateSeedIds: string[];
    invalidContactBooleanIndexes: number[];
}

export class M02ExplodingSeedsObservationUnavailableError extends Error {
    constructor(readonly evidence: M02ExplodingSeedsObservationUnavailableEvidence) {
        const issues = [
            evidence.receivedSeedCount === evidence.expectedSeedCount
                ? undefined
                : `expected ${evidence.expectedSeedCount} seeds, received ${evidence.receivedSeedCount ?? 'non-array input'}`,
            evidence.missingSeedIndexes.length > 0
                ? `missing indexes: ${evidence.missingSeedIndexes.join(', ')}`
                : undefined,
            evidence.invalidSeedIdentityIndexes.length > 0
                ? `invalid identities at indexes: ${evidence.invalidSeedIdentityIndexes.join(', ')}`
                : undefined,
            evidence.duplicateSeedIds.length > 0
                ? `duplicate identities: ${evidence.duplicateSeedIds.join(', ')}`
                : undefined,
            evidence.invalidContactBooleanIndexes.length > 0
                ? `invalid contact booleans at indexes: ${evidence.invalidContactBooleanIndexes.join(', ')}`
                : undefined
        ].filter((issue): issue is string => issue !== undefined);

        super(`M02 Exploding Seeds observation unavailable: ${issues.join('; ')}`);
        this.name = 'M02ExplodingSeedsObservationUnavailableError';
    }
}

function unavailableEvidence(input: unknown): M02ExplodingSeedsObservationUnavailableEvidence {
    const expectedSeedCount =
        M02_EXPLODING_SEEDS_OBSERVATION_CONTRACT.observations.seedStalkTouchAtEnd.expectedSeedCount;
    const receivedSeedCount = Array.isArray(input) ? input.length : null;
    const missingSeedIndexes: number[] = [];
    const invalidSeedIdentityIndexes: number[] = [];
    const invalidContactBooleanIndexes: number[] = [];
    const seedIdCounts = new Map<string, number>();

    for (let index = 0; index < expectedSeedCount; index++) {
        if (!Array.isArray(input) || !(index in input)) {
            missingSeedIndexes.push(index);
            continue;
        }

        const candidate: unknown = input[index];
        if (typeof candidate !== 'object' || candidate === null) {
            invalidSeedIdentityIndexes.push(index);
            invalidContactBooleanIndexes.push(index);
            continue;
        }

        const record = candidate as Record<string, unknown>;
        if (typeof record.seedId !== 'string' || record.seedId.trim().length === 0) {
            invalidSeedIdentityIndexes.push(index);
        } else {
            seedIdCounts.set(record.seedId, (seedIdCounts.get(record.seedId) ?? 0) + 1);
        }

        if (typeof record.isTouchingStalk !== 'boolean') {
            invalidContactBooleanIndexes.push(index);
        }
    }

    return {
        status: 'unavailable',
        reason: 'invalid-seed-contact-input',
        expectedSeedCount,
        receivedSeedCount,
        missingSeedIndexes,
        invalidSeedIdentityIndexes,
        duplicateSeedIds: [...seedIdCounts.entries()]
            .filter(([, count]) => count > 1)
            .map(([seedId]) => seedId),
        invalidContactBooleanIndexes
    };
}

function hasUnavailableEvidence(
    evidence: M02ExplodingSeedsObservationUnavailableEvidence
): boolean {
    return (
        evidence.receivedSeedCount !== evidence.expectedSeedCount ||
        evidence.missingSeedIndexes.length > 0 ||
        evidence.invalidSeedIdentityIndexes.length > 0 ||
        evidence.duplicateSeedIds.length > 0 ||
        evidence.invalidContactBooleanIndexes.length > 0
    );
}

/**
 * Validates caller-observed end-state contact facts without inferring seed identities, physics
 * bodies, contact geometry, tolerances, or official scoring eligibility.
 */
export function observeM02ExplodingSeeds(
    seedStalkTouchAtEnd: readonly M02SeedStalkTouchObservation[]
): M02ExplodingSeedsObservation {
    const evidence = unavailableEvidence(seedStalkTouchAtEnd);
    if (hasUnavailableEvidence(evidence)) {
        throw new M02ExplodingSeedsObservationUnavailableError(evidence);
    }

    return {
        seedStalkTouchAtEnd: seedStalkTouchAtEnd.map(({ seedId, isTouchingStalk }) => ({
            seedId,
            isTouchingStalk
        }))
    };
}
