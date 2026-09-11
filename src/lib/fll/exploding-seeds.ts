import { M02_EXPLODING_SEEDS_OBSERVATION_CONTRACT } from '$lib/fll/m02-exploding-seeds-observation-contract';
import { M02_EXPLODING_SEEDS_SOURCE_RECORD } from '$lib/fll/m02-exploding-seeds-source-record';

export interface ExplodingSeedStalkObservation {
    seedId: string;
    isTouchingStalk: boolean;
}

export interface ExplodingSeedsObservation {
    seeds: readonly [
        ExplodingSeedStalkObservation,
        ExplodingSeedStalkObservation,
        ExplodingSeedStalkObservation
    ];
}

export interface M02GlobalMatchEligibility {
    allowsMissionPoints: boolean;
    reasons: readonly string[];
}

export interface ExplodingSeedsScoreCondition {
    seedId: string;
    points: number;
    qualifies: boolean;
    awarded: boolean;
    explanation: string;
}

export interface ExplodingSeedsScore {
    missionId: 'M02';
    points: number;
    conditions: ExplodingSeedsScoreCondition[];
    globalMatchEligibility: M02GlobalMatchEligibility;
    source: typeof M02_EXPLODING_SEEDS_SOURCE_RECORD;
}

export class ExplodingSeedsInputValidationError extends Error {
    constructor(message: string) {
        super(`Invalid M02 Exploding Seeds scoring input: ${message}`);
        this.name = 'ExplodingSeedsInputValidationError';
    }
}

export function scoreExplodingSeeds(
    observation: ExplodingSeedsObservation,
    globalMatchEligibility: M02GlobalMatchEligibility
): ExplodingSeedsScore {
    validateObservation(observation);
    validateGlobalMatchEligibility(globalMatchEligibility);

    const pointsPerSeed = M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.scoring.points;
    const allowsMissionPoints = globalMatchEligibility.allowsMissionPoints;
    const conditions = observation.seeds.map((seed) => {
        const qualifies = !seed.isTouchingStalk;
        const awarded = allowsMissionPoints && qualifies;

        return {
            seedId: seed.seedId,
            points: pointsPerSeed,
            qualifies,
            awarded,
            explanation: awarded
                ? 'The seed is no longer touching the stalk at the end of the match.'
                : !allowsMissionPoints
                  ? 'General match eligibility does not allow M02 points.'
                  : 'The seed is touching the stalk at the end of the match.'
        };
    });

    return {
        missionId: 'M02',
        points: conditions.reduce(
            (total, condition) => total + (condition.awarded ? pointsPerSeed : 0),
            0
        ),
        conditions,
        globalMatchEligibility,
        source: M02_EXPLODING_SEEDS_SOURCE_RECORD
    };
}

function validateObservation(observation: ExplodingSeedsObservation): void {
    assertExactObjectKeys(observation, ['seeds'], 'observation');

    if (!Array.isArray(observation.seeds)) {
        throw new ExplodingSeedsInputValidationError('observation.seeds must be an array.');
    }

    const expectedSeedCount =
        M02_EXPLODING_SEEDS_OBSERVATION_CONTRACT.observations.seedStalkTouchAtEnd.expectedSeedCount;
    if (observation.seeds.length !== expectedSeedCount) {
        throw new ExplodingSeedsInputValidationError(
            `observation.seeds must contain exactly ${expectedSeedCount} seeds.`
        );
    }

    const seedIds = new Set<string>();
    for (const [index, seed] of observation.seeds.entries()) {
        assertExactObjectKeys(seed, ['seedId', 'isTouchingStalk'], `observation.seeds[${index}]`);

        if (typeof seed.seedId !== 'string' || seed.seedId.trim().length === 0) {
            throw new ExplodingSeedsInputValidationError(
                `observation.seeds[${index}].seedId must be a non-empty string.`
            );
        }
        if (typeof seed.isTouchingStalk !== 'boolean') {
            throw new ExplodingSeedsInputValidationError(
                `observation.seeds[${index}].isTouchingStalk must be a boolean.`
            );
        }
        if (seedIds.has(seed.seedId)) {
            throw new ExplodingSeedsInputValidationError(
                'observation.seeds must use distinct seedId values.'
            );
        }

        seedIds.add(seed.seedId);
    }
}

function validateGlobalMatchEligibility(eligibility: M02GlobalMatchEligibility): void {
    assertExactObjectKeys(
        eligibility,
        ['allowsMissionPoints', 'reasons'],
        'globalMatchEligibility'
    );

    if (typeof eligibility.allowsMissionPoints !== 'boolean') {
        throw new ExplodingSeedsInputValidationError(
            'globalMatchEligibility.allowsMissionPoints must be a boolean.'
        );
    }
    if (!Array.isArray(eligibility.reasons)) {
        throw new ExplodingSeedsInputValidationError(
            'globalMatchEligibility.reasons must be an array of non-empty strings.'
        );
    }
    if (
        eligibility.reasons.some(
            (reason) => typeof reason !== 'string' || reason.trim().length === 0
        )
    ) {
        throw new ExplodingSeedsInputValidationError(
            'globalMatchEligibility.reasons must contain only non-empty strings.'
        );
    }
    if (!eligibility.allowsMissionPoints && eligibility.reasons.length === 0) {
        throw new ExplodingSeedsInputValidationError(
            'globalMatchEligibility.reasons must explain an ineligible result.'
        );
    }
}

function assertExactObjectKeys(
    value: unknown,
    expectedKeys: readonly string[],
    fieldName: string
): asserts value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new ExplodingSeedsInputValidationError(`${fieldName} must be an object.`);
    }

    const actualKeys = Object.keys(value).sort();
    const sortedExpectedKeys = [...expectedKeys].sort();
    if (
        actualKeys.length !== sortedExpectedKeys.length ||
        actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
    ) {
        throw new ExplodingSeedsInputValidationError(
            `${fieldName} must contain exactly: ${sortedExpectedKeys.join(', ')}.`
        );
    }
}
