import { M02_EXPLODING_SEEDS_SOURCE_RECORD } from '$lib/fll/m02-exploding-seeds-source-record';

export const M02_EXPLODING_SEEDS_OBSERVATION_CONTRACT = {
    contractVersion: 1,
    mission: M02_EXPLODING_SEEDS_SOURCE_RECORD.mission,
    evaluation: {
        kind: 'official-end-of-match',
        when: 'After the 2.5-minute match ends and before scoring is recorded.',
        requirement: 'Each scored condition must be visibly met at that time.',
        source: M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.evaluationTiming.source,
        livePracticeFeedback: {
            permitted: true,
            officialEquivalent: false,
            reason: 'The official source defines scoring at match end; intermediate feedback is not an official score.'
        }
    },
    observations: {
        seedStalkTouchAtEnd: {
            required: true,
            expectedSeedCount: M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.scoredSeedCount.count,
            cardinality: 'exactly one boolean result for each official scored seed',
            fields: {
                seedId: 'Stable identity for one official scored seed.',
                isTouchingStalk:
                    'true when that seed is touching the stalk at official end-of-match evaluation.'
            },
            qualification: 'A seed qualifies only when isTouchingStalk is false.',
            source: M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.scoring.source,
            unresolved:
                'The contact method, seed/stalk identities, geometry, and numerical tolerance are not established by this contract.'
        },
        globalMatchEligibility: {
            required: true,
            producer: 'Match-rule adjudicator outside this mission observation contract.',
            fields: {
                allowsMissionPoints:
                    'Whether general robot-game rules permit points earned by the attempted M02 action.',
                reasons: 'Rule identifiers and observable facts for any ineligible result.'
            },
            unresolved:
                'No general-rule adjudicator exists in this contract; mission scoring must not infer legality from contact or motion data.'
        }
    },
    scoring: {
        conditions: [
            {
                id: 'seed-no-longer-touching-stalk',
                observable: 'seedStalkTouchAtEnd.isTouchingStalk === false',
                points: M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.scoring.points,
                awardUnit: M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.scoring.awardUnit,
                source: M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.scoring.source
            }
        ],
        aggregation:
            'Award 10 points for each qualifying seed only when globalMatchEligibility.allowsMissionPoints is true.',
        unverified:
            'No executable scorer is provided because the required identity, contact, geometry, mechanics, and match-rule inputs remain unresolved.'
    },
    equipmentConstraints: {
        missionSpecificNoEquipmentConstraint: {
            applies: M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.equipmentConstraint.applies,
            effect: 'Do not require an M02 mission-model-versus-equipment contact observation solely for the No Equipment Constraint rule.',
            source: M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.equipmentConstraint.source
        },
        generalEquipmentRules: {
            status: 'external-required',
            scope: 'Equipment legality and any general-rule point invalidation belong to the match-rule adjudicator.',
            source: 'rulebook pages 13-17, glossary and Rules 1-20'
        }
    },
    reset: {
        required: true,
        requirement:
            'A new observation must use the official initial M02 configuration; reset behavior is unresolved until model identities and mechanics are verified.',
        source: 'rulebook page 5 identifies M02 as Challenge Set bag 3; official building instructions identify the M02 model.',
        unresolved: true
    },
    unresolvedInputs: M02_EXPLODING_SEEDS_SOURCE_RECORD.unresolvedInputs
} as const;

export type M02ExplodingSeedsObservationContract = typeof M02_EXPLODING_SEEDS_OBSERVATION_CONTRACT;
