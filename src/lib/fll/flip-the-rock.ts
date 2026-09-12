import { M03_FLIP_THE_ROCK_OBSERVATION_CONTRACT } from '$lib/fll/m03-flip-the-rock-observation-contract';
import type { M03FlipTheRockObservation } from '$lib/fll/m03-flip-the-rock-observations';

export interface M03GlobalMatchEligibility {
    allowsMissionPoints: boolean;
    reasons: readonly string[];
}

export interface FlipTheRockScoreCondition {
    id: 'research-flag-down' | 'rock-returned-bonus';
    points: number;
    qualifies: boolean;
    awarded: boolean;
    explanation: string;
}

export interface FlipTheRockScore {
    missionId: 'M03';
    points: number;
    conditions: FlipTheRockScoreCondition[];
    globalMatchEligibility: M03GlobalMatchEligibility;
}

export class FlipTheRockInputValidationError extends Error {
    constructor(message: string) {
        super(`Invalid M03 Flip the Rock scoring input: ${message}`);
        this.name = 'FlipTheRockInputValidationError';
    }
}

export function scoreFlipTheRock(
    observation: M03FlipTheRockObservation,
    globalMatchEligibility: M03GlobalMatchEligibility
): FlipTheRockScore {
    validateObservation(observation);
    validateEligibility(globalMatchEligibility);

    const flagPoints = M03_FLIP_THE_ROCK_OBSERVATION_CONTRACT.scoring.conditions[0].points;
    const bonusPoints = M03_FLIP_THE_ROCK_OBSERVATION_CONTRACT.scoring.conditions[1].points;
    const flagAwarded = globalMatchEligibility.allowsMissionPoints && observation.researchFlagDown;
    const bonusQualifies =
        observation.researchFlagDown && observation.rockReturnedToOriginalPosition;
    const bonusAwarded = globalMatchEligibility.allowsMissionPoints && bonusQualifies;

    return {
        missionId: 'M03',
        points: (flagAwarded ? flagPoints : 0) + (bonusAwarded ? bonusPoints : 0),
        conditions: [
            {
                id: 'research-flag-down',
                points: flagPoints,
                qualifies: observation.researchFlagDown,
                awarded: flagAwarded,
                explanation: flagAwarded
                    ? 'The research flag is down at end-of-match evaluation.'
                    : !globalMatchEligibility.allowsMissionPoints
                      ? 'General match eligibility does not allow M03 points.'
                      : 'The research flag is not down at end-of-match evaluation.'
            },
            {
                id: 'rock-returned-bonus',
                points: bonusPoints,
                qualifies: bonusQualifies,
                awarded: bonusAwarded,
                explanation: bonusAwarded
                    ? 'The rock is returned to its original starting position.'
                    : !globalMatchEligibility.allowsMissionPoints
                      ? 'General match eligibility does not allow M03 points.'
                      : 'The M03 return bonus condition is not met.'
            }
        ],
        globalMatchEligibility
    };
}

function validateObservation(observation: M03FlipTheRockObservation): void {
    assertExactKeys(observation, ['researchFlagDown', 'rockReturnedToOriginalPosition'], 'observation');
    if (typeof observation.researchFlagDown !== 'boolean') {
        throw new FlipTheRockInputValidationError('observation.researchFlagDown must be a boolean.');
    }
    if (typeof observation.rockReturnedToOriginalPosition !== 'boolean') {
        throw new FlipTheRockInputValidationError(
            'observation.rockReturnedToOriginalPosition must be a boolean.'
        );
    }
}

function validateEligibility(eligibility: M03GlobalMatchEligibility): void {
    assertExactKeys(eligibility, ['allowsMissionPoints', 'reasons'], 'globalMatchEligibility');
    if (typeof eligibility.allowsMissionPoints !== 'boolean') {
        throw new FlipTheRockInputValidationError(
            'globalMatchEligibility.allowsMissionPoints must be a boolean.'
        );
    }
    if (
        !Array.isArray(eligibility.reasons) ||
        eligibility.reasons.some((reason) => typeof reason !== 'string' || reason.trim().length === 0)
    ) {
        throw new FlipTheRockInputValidationError(
            'globalMatchEligibility.reasons must contain only non-empty strings.'
        );
    }
    if (!eligibility.allowsMissionPoints && eligibility.reasons.length === 0) {
        throw new FlipTheRockInputValidationError(
            'globalMatchEligibility.reasons must explain an ineligible result.'
        );
    }
}

function assertExactKeys(value: unknown, expectedKeys: readonly string[], fieldName: string): void {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new FlipTheRockInputValidationError(`${fieldName} must be an object.`);
    }
    const actualKeys = Object.keys(value).sort();
    const sortedExpectedKeys = [...expectedKeys].sort();
    if (
        actualKeys.length !== sortedExpectedKeys.length ||
        actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
    ) {
        throw new FlipTheRockInputValidationError(
            `${fieldName} must contain exactly: ${sortedExpectedKeys.join(', ')}.`
        );
    }
}
