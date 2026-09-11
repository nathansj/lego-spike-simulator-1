import {
    BIOGLOW_EXTERNAL_MPD_INVENTORY,
    BIOGLOW_EXTERNAL_MPD_INVENTORY_CAPTURED_ON,
    BIOGLOW_EXTERNAL_MPD_SOURCE_DIRECTORY,
    findBioglowExternalMpdAsset
} from '$lib/fll/bioglow-external-mpd-inventory';
import { M02_EXPLODING_SEEDS_SOURCE_RECORD } from '$lib/fll/m02-exploding-seeds-source-record';

const m02MpdAsset = findBioglowExternalMpdAsset('45832_02.mpd');

if (!m02MpdAsset) {
    throw new Error('The BIOGLOW external MPD inventory is missing 45832_02.mpd.');
}

/**
 * Evidence intake for the supplied M02 MPD. Generic MPD groups are recorded exactly as found
 * and are not assigned mission semantics or admitted as moving physics bodies.
 */
export const M02_MODEL_EVIDENCE_INTAKE_RECORD = {
    recordVersion: 1,
    mission: M02_EXPLODING_SEEDS_SOURCE_RECORD.mission,
    capturedOn: BIOGLOW_EXTERNAL_MPD_INVENTORY_CAPTURED_ON,
    scope: {
        purpose:
            'Record reproducible facts from the supplied M01-M13 MPD collection, the selected M02 MPD, its provenance inventory entry, and the existing official M02 source record.',
        excludes:
            'This record does not assign seed or stalk identities, interpret generic submodels, admit geometry, define field placement, add joints, specify collision behavior, or calibrate mechanics.'
    },
    suppliedCollection: {
        sourceDirectory: BIOGLOW_EXTERNAL_MPD_SOURCE_DIRECTORY,
        inventoriedAssetCount: BIOGLOW_EXTERNAL_MPD_INVENTORY.length,
        inventoriedMissionIds: BIOGLOW_EXTERNAL_MPD_INVENTORY.map(({ missionId }) => missionId),
        inventoriedFileNames: BIOGLOW_EXTERNAL_MPD_INVENTORY.map(({ fileName }) => fileName),
        finding:
            'The provenance inventory contains one supplied MPD for every mission ID from M01 through M13; 45832_02.mpd is the M02 entry.',
        limitation:
            'Collection membership and file identity do not establish that any MPD is official, dimensionally calibrated, correctly placed, or mechanically accurate.'
    },
    officialMissionEvidence: {
        sourceRecordVersion: M02_EXPLODING_SEEDS_SOURCE_RECORD.recordVersion,
        missionModelInstructions:
            M02_EXPLODING_SEEDS_SOURCE_RECORD.sources.missionModelInstructions,
        scoring: M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.scoring,
        scoredSeedCount: M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.scoredSeedCount,
        evaluationTiming: M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.evaluationTiming,
        equipmentConstraint: M02_EXPLODING_SEEDS_SOURCE_RECORD.directRules.equipmentConstraint
    },
    suppliedMpdEvidence: {
        identity: {
            missionId: m02MpdAsset.missionId,
            fileName: m02MpdAsset.fileName,
            localSourcePath: m02MpdAsset.localSourcePath,
            format: m02MpdAsset.format,
            integrity: m02MpdAsset.integrity,
            provenanceStatus: m02MpdAsset.provenance.status,
            usableTerms: m02MpdAsset.provenance.usableTerms
        },
        headerDeclarations: {
            geometrySource: 'https://komurobo.com/3d/bioglow/M02.io',
            crossCheck:
                'Cross-check source: official LEGO Education 45832_02 building instructions',
            status: 'mpd-header-declarations-not-independently-verified'
        },
        structure: {
            lineCount: 250,
            rootFile: '45832_02.ldr',
            rootType1ReferenceCount: 33,
            embeddedFileCount: 7,
            embeddedFiles: [
                '45832_02.ldr',
                'SubModel Group 1',
                'SubModel Group 2',
                'SubModel Group 3',
                '57539.dat Copy 3',
                '57539.dat Copy 4',
                'SubModel Group 3_Mirrored'
            ],
            rootEmbeddedSubmodelReferences: [
                'submodel group 1',
                'submodel group 2',
                'submodel group 3',
                '57539.dat copy 3',
                '57539.dat copy 4',
                'submodel group 3_mirrored'
            ],
            declaredBrickCounts: [
                { file: '45832_02.ldr', count: 68 },
                { file: 'SubModel Group 1', count: 15 },
                { file: 'SubModel Group 2', count: 10 },
                { file: 'SubModel Group 3', count: 7 },
                { file: 'SubModel Group 3_Mirrored', count: 7 }
            ],
            missionSemanticLabels: {
                status: 'absent',
                searchedTerms: ['seed', 'stalk'],
                finding:
                    'The supplied M02 MPD contains no seed or stalk labels; its functional submodels use generic group names.'
            }
        }
    },
    unresolvedEvidence: {
        videoReview: {
            status: 'unresolved-not-reviewed',
            required:
                'Review the official Field Setup Video and Robot Game Mission Video identified by the source record authority order, recording M02-specific timestamps and directly visible initial, actuated, and final states.',
            maySupport:
                'Visible component roles, motion sequence, setup state, and candidate semantic mapping.',
            doesNotAloneSupport:
                'Exact dimensions, masses, material parameters, joint anchors, joint limits, contact tolerances, or repeatability.'
        },
        physicalMeasurement: {
            status: 'unresolved-not-measured',
            requiredMeasurements: [
                'assembled-model dimensions and field registration',
                'stable component partition and reset pose',
                'pivot or translation axes, anchors, and travel limits',
                'component masses and repeatable release behavior',
                'contact boundary and scoring-observation tolerance'
            ],
            finding:
                'No physical measurements or repeatable model trials are present in the supplied MPD or official M02 source record.'
        },
        semanticIdentity: {
            status: 'unresolved',
            finding:
                'The three official scored seeds and stalk cannot be mapped to the generic MPD groups from names alone.'
        },
        coordinateRegistration: {
            status: 'unresolved',
            finding:
                'The MPD contains transforms but does not declare simulator units, axes, origin, field pose, or conversion transform.'
        },
        mechanics: {
            status: 'unresolved',
            finding:
                'Neither the MPD nor the official scoring source record defines simulator bodies, colliders, joints, forces, friction, damping, release thresholds, or reset dynamics.'
        }
    },
    admission: {
        status: 'evidence-intake-only',
        permits: [
            'Rechecking the selected M02 file identity and generic MPD structure.',
            'Using the official source record as the authority for M02 scoring facts.'
        ],
        blocks: 'Physics, scoring-contact integration, semantic body IDs, and calibrated-mechanics claims remain blocked until the unresolved evidence is supplied and reviewed.'
    }
} as const;

export type M02ModelEvidenceIntakeRecord = typeof M02_MODEL_EVIDENCE_INTAKE_RECORD;
