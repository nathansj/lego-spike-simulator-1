import { findBioglowInstructionResource } from '$lib/fll/bioglow-instruction-resources';

const instructionResource = findBioglowInstructionResource('M03');

if (!instructionResource) {
    throw new Error('The BIOGLOW instruction resource map is missing M03.');
}

export const M03_FLIP_THE_ROCK_OBSERVATION_CONTRACT = {
    contractVersion: 1,
    mission: {
        id: 'M03',
        name: 'Flip the Rock'
    },
    sources: {
        scoresheet: {
            title: 'FIRST LEGO League Challenge BIOGLOW Robot Game Software Scoresheet',
            url: 'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-software-scoresheet.pdf',
            locator: 'page 1, MISSION 03 FLIP THE ROCK',
            supports: 'The research flag observable and its bonus condition.'
        },
        missionModelInstructions: {
            title: 'FIRST LEGO League Challenge BIOGLOW Mission 03 Building Instructions',
            url: instructionResource.url,
            locator: 'Mission 03: Flip the Rock',
            supports: 'Construction reference for the rotating platform and lever assemblies.'
        }
    },
    evaluation: {
        kind: 'official-end-of-match',
        requirement: 'Mission requirements must be visibly met when the match ends.',
        livePracticeFeedback: {
            permitted: true,
            officialEquivalent: false,
            reason: 'Intermediate simulator state is not an official score.'
        }
    },
    observations: {
        researchFlagDown: {
            required: true,
            type: 'boolean',
            qualification: 'The research flag is visibly down at end-of-match evaluation.'
        },
        rockReturnedToOriginalPosition: {
            required: true,
            type: 'boolean',
            qualification:
                'The rock is visibly returned to its original starting position at end-of-match evaluation.',
            dependency: 'Only evaluate this bonus condition when researchFlagDown is true.'
        }
    },
    scoring: {
        status: 'point-values-unresolved',
        conditions: [
            {
                id: 'research-flag-down',
                observable: 'researchFlagDown === true'
            },
            {
                id: 'rock-returned-bonus',
                observable:
                    'researchFlagDown === true && rockReturnedToOriginalPosition === true'
            }
        ],
        unverified:
            'Point values, stable model identities, visible-state tolerances, and global match eligibility remain unresolved.'
    },
    reset: {
        required: true,
        unresolved: true,
        requirement: 'A new observation must use the official initial M03 configuration.'
    }
} as const;

export type M03FlipTheRockObservationContract =
    typeof M03_FLIP_THE_ROCK_OBSERVATION_CONTRACT;
