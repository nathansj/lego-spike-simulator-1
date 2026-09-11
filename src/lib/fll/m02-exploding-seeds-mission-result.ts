import {
    ExplodingSeedsInputValidationError,
    scoreExplodingSeeds,
    type ExplodingSeedsObservation,
    type ExplodingSeedsScore,
    type M02GlobalMatchEligibility
} from '$lib/fll/exploding-seeds';
import {
    M02ExplodingSeedsObservationUnavailableError,
    observeM02ExplodingSeeds,
    type M02ExplodingSeedsObservation,
    type M02ExplodingSeedsObservationUnavailableEvidence,
    type M02SeedStalkTouchObservation
} from '$lib/fll/m02-exploding-seeds-observations';

export type M02ExplodingSeedsObservationAdapter<TObservationGeometry> = (
    observationGeometry: TObservationGeometry
) => readonly M02SeedStalkTouchObservation[];

export interface M02ExplodingSeedsMissionResultInput<TObservationGeometry> {
    observationGeometry: TObservationGeometry;
    observeSeedStalkTouchAtEnd: M02ExplodingSeedsObservationAdapter<TObservationGeometry>;
    globalMatchEligibility: M02GlobalMatchEligibility;
}

export interface M02ExplodingSeedsScoredMissionResult {
    missionId: 'M02';
    status: 'scored';
    observation: M02ExplodingSeedsObservation;
    score: ExplodingSeedsScore;
}

export type M02ExplodingSeedsMissionResultUnavailableEvidence =
    | {
          status: 'unavailable';
          reason: 'observation-geometry-unavailable';
      }
    | {
          status: 'unavailable';
          reason: 'observation-adapter-unavailable';
      }
    | {
          status: 'unavailable';
          reason: 'observation-unavailable';
          observation: M02ExplodingSeedsObservationUnavailableEvidence;
      }
    | {
          status: 'unavailable';
          reason: 'global-match-eligibility-unavailable';
          message: string;
      };

export interface M02ExplodingSeedsUnavailableMissionResult {
    missionId: 'M02';
    status: 'unavailable';
    evidence: M02ExplodingSeedsMissionResultUnavailableEvidence;
}

export type M02ExplodingSeedsMissionResult =
    | M02ExplodingSeedsScoredMissionResult
    | M02ExplodingSeedsUnavailableMissionResult;

export function evaluateM02ExplodingSeedsAtMatchEnd<TObservationGeometry>(
    input: M02ExplodingSeedsMissionResultInput<TObservationGeometry>
): M02ExplodingSeedsMissionResult {
    if (input?.observationGeometry === undefined || input.observationGeometry === null) {
        return unavailable({
            status: 'unavailable',
            reason: 'observation-geometry-unavailable'
        });
    }
    if (typeof input.observeSeedStalkTouchAtEnd !== 'function') {
        return unavailable({
            status: 'unavailable',
            reason: 'observation-adapter-unavailable'
        });
    }
    if (input.globalMatchEligibility === undefined || input.globalMatchEligibility === null) {
        return unavailable({
            status: 'unavailable',
            reason: 'global-match-eligibility-unavailable',
            message: 'M02 global match eligibility is required.'
        });
    }

    let observation: M02ExplodingSeedsObservation;
    try {
        observation = observeM02ExplodingSeeds(
            input.observeSeedStalkTouchAtEnd(input.observationGeometry)
        );
    } catch (error) {
        if (error instanceof M02ExplodingSeedsObservationUnavailableError) {
            return unavailable({
                status: 'unavailable',
                reason: 'observation-unavailable',
                observation: error.evidence
            });
        }
        throw error;
    }

    try {
        return {
            missionId: 'M02',
            status: 'scored',
            observation,
            score: scoreExplodingSeeds(
                toScoringObservation(observation),
                input.globalMatchEligibility
            )
        };
    } catch (error) {
        if (error instanceof ExplodingSeedsInputValidationError) {
            return unavailable({
                status: 'unavailable',
                reason: 'global-match-eligibility-unavailable',
                message: error.message
            });
        }
        throw error;
    }
}

function toScoringObservation(
    observation: M02ExplodingSeedsObservation
): ExplodingSeedsObservation {
    const [firstSeed, secondSeed, thirdSeed] = observation.seedStalkTouchAtEnd;

    return {
        seeds: [firstSeed, secondSeed, thirdSeed]
    };
}

function unavailable(
    evidence: M02ExplodingSeedsMissionResultUnavailableEvidence
): M02ExplodingSeedsUnavailableMissionResult {
    return {
        missionId: 'M02',
        status: 'unavailable',
        evidence
    };
}
