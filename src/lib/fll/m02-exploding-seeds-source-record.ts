export const M02_EXPLODING_SEEDS_SOURCE_RECORD = {
    recordVersion: 1,
    mission: {
        id: 'M02',
        name: 'Exploding Seeds',
        edition: 'BIOGLOW Founders Edition Challenge 2026-27'
    },
    verifiedOn: '2026-09-11',
    authorityOrder: {
        statement:
            'The official FIRST Challenge Updates, Field Setup Video, Robot Game Mission Video, and Robot Game Rulebook pictures and text are the only sources of authority.',
        source: {
            title: 'FIRST LEGO League Challenge BIOGLOW Robot Game Rulebook',
            url: 'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-rgr.pdf',
            locator: 'page 13, IMPORTANT!'
        }
    },
    sources: {
        seasonMaterials: {
            title: 'FIRST LEGO League BIOGLOW Season Materials',
            url: 'https://www.firstinspires.org/resources/library/fll/season-materials',
            locator:
                '2026-2027 BIOGLOW Season Materials > Founders Edition > FIRST LEGO League Challenge > Guidebook and Challenge Updates',
            revision: 'Live resource index checked 2026-09-11',
            supports: 'Selected edition and current official Challenge resource links.'
        },
        rulebook: {
            title: 'FIRST LEGO League Challenge BIOGLOW Robot Game Rulebook',
            url: 'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-rgr.pdf',
            locator: 'page 9, Mission 02: Exploding Seeds',
            revision:
                'No document revision or update date displayed; ©2026 FIRST and the LEGO Group.',
            supports:
                'Mission identity, labeled stalk and seeds, and “Seeds no longer touching the stalk: 10 each.”'
        },
        scoresheet: {
            title: 'FIRST LEGO League Challenge BIOGLOW Robot Game Software Scoresheet',
            url: 'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-software-scoresheet.pdf',
            locator: 'page 1, MISSION 02 EXPLODING SEEDS',
            revision: 'No document revision or update date displayed.',
            supports:
                'The scored observable is the number of seeds no longer touching the stalk, with choices 0, 1, 2, and 3.'
        },
        challengeUpdates: {
            title: 'FIRST LEGO League Challenge BIOGLOW Challenge Updates',
            url: 'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-updates.pdf',
            locator: 'page 1, Update 01, updated September 2, 2026',
            revision: 'Update 01, 2026-09-02',
            supports:
                'Current superseding update reviewed; it changes Mission 04 Lucky Leaves and contains no M02 amendment.'
        },
        missionModelInstructions: {
            title: 'FIRST LEGO League Challenge BIOGLOW Mission 02 Building Instructions',
            url: 'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bi-enus-book-02.pdf',
            locator: 'Mission 02, Build Bag 3, pages 1-15',
            revision: '©2026 FIRST and the LEGO Group.',
            supports:
                'Official M02 model construction reference; it does not by itself calibrate simulator geometry or mechanics.'
        }
    },
    directRules: {
        scoring: {
            condition: 'Seeds no longer touching the stalk.',
            points: 10,
            awardUnit: 'each qualifying seed',
            source: 'rulebook page 9, Mission 02: Exploding Seeds'
        },
        scoredSeedCount: {
            count: 3,
            source: 'software scoresheet page 1, MISSION 02 EXPLODING SEEDS choices 0, 1, 2, and 3'
        },
        evaluationTiming: {
            timing: 'end of the 2.5-minute match',
            visibility: 'Mission requirements must be visibly met.',
            source: 'rulebook pages 4 and 18, Understand Scoring and Rules 21-22'
        },
        equipmentConstraint: {
            applies: false,
            finding:
                'The M02 mission card on rulebook page 9 has no No Equipment Constraint symbol.',
            source: 'rulebook page 8 defines the symbol as applying only to the mission in whose top-right corner it appears; page 9 visual M02 card'
        }
    },
    unresolvedInputs: [
        {
            id: 'seed-and-stalk-semantic-identities',
            status: 'unresolved',
            missing:
                'Stable simulator body or collider identities for the stalk and each of the three scored seeds.'
        },
        {
            id: 'seed-stalk-touch-observation',
            status: 'unresolved',
            missing:
                'A source-faithful contact or visible-state observation that decides whether each seed is touching the stalk at match end.'
        },
        {
            id: 'model-geometry-and-placement',
            status: 'unresolved',
            missing:
                'Validated M02 geometry, field placement, and coordinate registration against the official assembled model and field setup.'
        },
        {
            id: 'release-mechanics',
            status: 'unresolved',
            missing:
                'Verified seed-pod release mechanism, joints, forces, collision behavior, and reset state. The rule sources do not specify simulator mechanics.'
        },
        {
            id: 'touch-boundary-and-referee-judgment',
            status: 'unresolved',
            missing:
                'A calibrated numerical tolerance for visible “touching” or a method for resolving ambiguous calls. The rulebook gives the referee final authority.'
        },
        {
            id: 'global-match-eligibility',
            status: 'unresolved',
            missing:
                'A match-rule adjudication input for actions that invalidate points under general robot-game rules; this M02 record does not infer that status from physics.'
        }
    ]
} as const;

export type M02ExplodingSeedsSourceRecord = typeof M02_EXPLODING_SEEDS_SOURCE_RECORD;
