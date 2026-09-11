import { M02_EXPLODING_SEEDS_SOURCE_RECORD } from '$lib/fll/m02-exploding-seeds-source-record';

/**
 * Evidence-only inventory for admitting a future M02 model asset. This record must not be
 * treated as geometry, placement, mechanism, or semantic-identity evidence.
 */
export const M02_EXPLODING_SEEDS_ASSET_AVAILABILITY_RECORD = {
    recordVersion: 1,
    mission: M02_EXPLODING_SEEDS_SOURCE_RECORD.mission,
    verifiedOn: '2026-09-11',
    scope: {
        purpose:
            'Record the availability and limits of M02 asset-related source links and repository inputs before model import or mechanics work.',
        excludes:
            'This record does not admit simulator geometry, field placement, stable seed or stalk identities, colliders, joints, release behavior, or calibration.'
    },
    officialReferences: {
        seasonMaterials: {
            status: 'verified-index',
            title: 'FIRST LEGO League BIOGLOW Season Materials',
            url: 'https://www.firstinspires.org/resources/library/fll/season-materials',
            locator:
                '2026-2027 BIOGLOW Season Materials > Founders Edition > FIRST LEGO League Challenge > Building Instructions > Model 2',
            supports:
                'The selected Founders Edition Challenge resource index links the Model 2 building instructions and shared field-setup resources.'
        },
        englishModelBuildingInstructions: {
            status: 'verified-document-link',
            title: 'FIRST LEGO League Challenge BIOGLOW Model 2 English Building Instructions',
            url: 'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-bi-enus-book-02.pdf',
            locator: 'Model 2 English building-instruction PDF, 15 pages',
            supports:
                'Official visual assembly instructions for Model 2; not an importable mesh, a coordinate registration, or calibrated simulator mechanics.'
        },
        fieldSetupReferenceGuide: {
            status: 'linked-not-extracted',
            title: 'FIRST LEGO League Challenge BIOGLOW Field Set-Up Reference Guide',
            url: 'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-field-setup-reference-guide.pdf',
            locator: 'Founders Edition Challenge season-materials page > Support Resources',
            supports:
                'Potential placement evidence. Its M02-specific placement content has not been extracted or registered in this record.'
        },
        fieldSetupVideo: {
            status: 'linked-not-reviewed',
            title: 'BIOGLOW Field Setup - Founders Edition',
            url: 'https://www.youtube.com/watch?v=wDan0826cn0',
            locator: 'Founders Edition Challenge season-materials page > Videos',
            supports:
                'Potential visual setup evidence only; this record does not derive geometry or placement from the video.'
        },
        robotGameMissionsVideo: {
            status: 'linked-not-reviewed',
            title: 'BIOGLOW Robot Game Missions Video - Founders Edition',
            url: 'https://www.youtube.com/watch?v=uhZZ8O1StiQ',
            locator: 'Founders Edition Challenge season-materials page > Videos',
            supports:
                'Potential mission-behavior evidence only; this record does not derive release mechanics or scoring observations from the video.'
        }
    },
    repositorySnapshot: {
        capturedOn: '2026-09-11',
        candidateModelFilename: '45832_02.mpd',
        placeholderSidecar: {
            status: 'present-unadmitted',
            path: 'src/lib/physics/model-sidecars/45832_02.physics.json',
            finding:
                'The sidecar is a single fixed auto-collider segment with no explicit colliders or joints; its metadata does not establish model geometry or mechanics.'
        },
        rootModelAsset: {
            status: 'absent-from-checkout',
            expectedRepositoryPath: 'static/ldraw/45832_02.mpd',
            finding:
                'No M02 root MPD, CAD, or other importable model asset is committed in this checkout.'
        },
        dependencyManifest: {
            status: 'root-name-only',
            path: 'static/ldraw/DEPENDENCY_MANIFEST.json',
            finding:
                'The manifest lists 45832_02.mpd among expected root names and bundled dependencies, but it does not contain the root model or prove its identity, terms, or geometry.'
        }
    },
    semanticIdentityAdmission: {
        status: 'not-admissible',
        finding:
            'No stable stalk or three seed body/collider identities are assigned because no admitted asset partition or placement registration exists.'
    },
    nextRequiredArtifact: {
        id: 'm02-model-asset-intake',
        title: 'M02 reproducible model-asset intake package',
        requiredEvidence: [
            'A permitted model asset or an explicit documented absence, with source URL or local-source identifier and terms.',
            'A cryptographic hash or equivalent immutable version identity for the admitted source file.',
            'Format, units, coordinate axes, origin, scale, and rotation convention.',
            'A reproducible import result that preserves root and segment identities.',
            'Field-reference evidence sufficient to register the model before assigning semantic seed or stalk identities.'
        ],
        gate: 'Only after this package is reviewed may a separate semantic manifest propose stable stalk and seed IDs. Mechanics still require their own source or measurement evidence.'
    }
} as const;

export type M02ExplodingSeedsAssetAvailabilityRecord =
    typeof M02_EXPLODING_SEEDS_ASSET_AVAILABILITY_RECORD;
