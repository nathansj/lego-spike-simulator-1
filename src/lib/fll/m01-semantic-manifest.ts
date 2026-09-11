/**
 * Stable semantic bindings for the current M01 Drone Survey regression fixture.
 *
 * This is an asset/observation contract, not an official field-geometry or
 * calibration profile. Consumers must provide the unresolved geometry inputs
 * required by `observeDroneSurvey` explicitly.
 */
export const M01_DRONE_SURVEY_SEMANTIC_MANIFEST = {
    manifestVersion: 1,
    mission: {
        id: 'M01',
        name: 'Drone Survey',
        season: 'BIOGLOW Founders Edition Challenge 2026-27'
    },
    provenance: {
        fixture: 'src/lib/physics/fixtures/drone-scene.json',
        sidecar: 'src/lib/physics/model-sidecars/45832_01.physics.json',
        observationAdapter: 'src/lib/fll/drone-survey-observations.ts',
        inspectedOn: '2026-09-10'
    },
    bodyIds: {
        mat: '#mat',
        equipment: ['#robot'],
        drone: '45832-01-drone',
        lidarMap: '45832-01-fixed-scenery',
        scanMarker: '45832-01-red-base',
        missionModel: [
            '45832-01-fixed-scenery',
            '45832-01-base',
            '45832-01-red-base',
            '45832-01-link-a',
            '45832-01-drone',
            '45832-01-link-b',
            '45832-01-rail-a',
            '45832-01-rail-b',
            '45832-01-pilot-base'
        ]
    },
    fixtureBodyIds: [
        '#robot',
        '45832-01-fixed-scenery',
        '45832-01-base',
        '45832-01-red-base',
        '45832-01-link-a',
        '45832-01-drone',
        '45832-01-link-b'
    ],
    unresolvedInputs: {
        mat: {
            status: 'unresolved',
            missing: ['official mat geometry and its coordinate registration to the fixture']
        },
        drone: {
            status: 'unresolved',
            missing: ['verified drone collision geometry and calibrated contact behavior']
        },
        lidarMap: {
            status: 'unresolved',
            missing: ['verified LiDAR map geometry and flipped target orientation']
        },
        scanMarker: {
            status: 'unresolved',
            missing: ['verified scan-marker footprint and local tracked-point offset']
        },
        equipment: {
            status: 'unresolved',
            missing: ['verified equipment geometry used for end-state contact evaluation']
        },
        surveyBounds: {
            status: 'unresolved',
            missing: ['official survey-area bounds in the mat local x/z frame']
        },
        flipTolerance: {
            status: 'unresolved',
            missing: ['source-backed maximum LiDAR map rotation error']
        }
    }
} as const;

export type M01DroneSurveySemanticManifest = typeof M01_DRONE_SURVEY_SEMANTIC_MANIFEST;
