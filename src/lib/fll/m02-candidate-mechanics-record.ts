import { findBioglowInstructionResource } from '$lib/fll/bioglow-instruction-resources';
import { M02_EXPLODING_SEEDS_SOURCE_RECORD } from '$lib/fll/m02-exploding-seeds-source-record';

const instructionResource = findBioglowInstructionResource('M02');

if (!instructionResource) {
    throw new Error('The BIOGLOW instruction resource map is missing M02.');
}

export const M02_CANDIDATE_MECHANICS_RECORD = {
    recordVersion: 1,
    mission: M02_EXPLODING_SEEDS_SOURCE_RECORD.mission,
    source: {
        title: 'FIRST LEGO League Challenge BIOGLOW Mission 02 text-based building instructions',
        url: instructionResource.url,
        locator: 'Mission 2: Exploding Seeds, steps 8-35',
        bookletNumber: instructionResource.bookletNumber,
        pageCount: instructionResource.pageCount
    },
    videoEvidence: {
        title: 'BIOGLOW Robot Game Missions Video - Founders Edition',
        url: 'https://www.youtube.com/watch?v=uhZZ8O1StiQ',
        locator:
            'approximately 00:02:07-00:02:26, Mission 02 title, model close-up, and scoring examples',
        observations: [
            'The model close-up visibly presents three seed objects associated with the stem and flexible loops.',
            'The scoring examples show 10 points for each qualifying seed and display three 10-point awards.'
        ],
        limitation:
            'The video does not establish MPD submodel identity mapping, dimensions, masses, joint anchors, travel limits, contact tolerances, or reset repeatability.'
    },
    status: 'candidate-not-admitted',
    candidatePartitions: [
        {
            id: 'm02-base-and-stand-candidate',
            role: 'stationary-support-candidate',
            evidence: 'Steps 1-7 construct the base and stand.'
        },
        {
            id: 'm02-plant-stem-candidate',
            role: 'stem-and-attachment-support-candidate',
            evidence: 'Steps 8-20 construct and attach a plant-stem assembly to the stand.'
        },
        {
            id: 'm02-seed-assembly-candidate-a',
            role: 'seed-assembly-candidate',
            evidence: 'Steps 21-27 construct and attach one seed assembly.'
        },
        {
            id: 'm02-seed-assembly-candidate-b',
            role: 'seed-assembly-candidate',
            evidence: 'Steps 28-35 construct and attach a second seed/flexible assembly.'
        },
        {
            id: 'm02-third-scored-seed-candidate',
            role: 'scored-seed-identity-candidate',
            evidence:
                'The Mission 02 video close-up visibly presents three scoring seed objects, but does not map the third object to a stable MPD submodel.'
        }
    ],
    candidateRelations: [
        {
            id: 'm02-seed-ring-on-stem-bar',
            relation: 'sliding-or-retained-attachment-candidate',
            evidence:
                'Steps 26-27 slide a seed ring onto a bar on the stem and position the seed next to the stand.'
        },
        {
            id: 'm02-flexible-loop-attachment',
            relation: 'flexible-retention-candidate',
            evidence:
                'Steps 33-35 attach flexible hoses to the seed and stem, then hook seed rings onto the stem bar.'
        }
    ],
    unresolved: [
        'The video confirms three visible scoring seed objects, but their mapping to stable MPD submodels and the exact stalk relationship remains unresolved.',
        'No pivot or slider axis, joint anchor, travel limit, release trigger, force, mass, friction, damping, or contact tolerance is admitted.',
        'No field placement, coordinate registration, reset trial, or repeatability measurement is admitted.'
    ],
    admissionBoundary:
        'This record identifies candidate construction partitions and relations for later review. It must not be used to replace the fixed placeholder sidecar or to produce score-connected physics.'
} as const;
