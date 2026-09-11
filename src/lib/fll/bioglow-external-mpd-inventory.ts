/**
 * Local, unbundled BIOGLOW model assets discovered outside this repository.
 *
 * These records make their identity and import compatibility reviewable. They do
 * not establish official geometry, usable redistribution terms, field placement,
 * mechanics, colliders, or calibration.
 */

export const BIOGLOW_EXTERNAL_MPD_SOURCE_DIRECTORY =
    '/Users/Sheldon/data/projects/sourcecode/FLL_Bioglow/models/complete/ldraw';

export const BIOGLOW_EXTERNAL_MPD_INVENTORY_CAPTURED_ON = '2026-09-11';

const MPD_ASSET_DATA = [
    [
        'M01',
        '45832_01.mpd',
        20266,
        '8ea98ffe2d456024faca23e6715b8145c4e6c2c1d0f23d3c90f600b13201da09'
    ],
    [
        'M02',
        '45832_02.mpd',
        26172,
        '5a90dcf1916bdd8e9fdc06e1835bdbb3edb941726319416ec8f306b74dc1486f'
    ],
    [
        'M03',
        '45832_03.mpd',
        19670,
        '0718ea34833230319b88bcb50939187d9c2b1d4feaa0b5d47006168d5f4d4843'
    ],
    [
        'M04',
        '45832_04.mpd',
        4891112,
        '6e795bfaf8e2b199679a98d028fd56d8c9ceb6cfe4e5aef3e178d564f01fb37a'
    ],
    [
        'M05',
        '45832_05.mpd',
        11312,
        'dfebaf6b9174d467dc4896f54a7dc881061bd320490d0605b6a40e7a0ad4c192'
    ],
    [
        'M06',
        '45832_06.mpd',
        1871684,
        '3bb5df5f5e3b326feb0b6148cdc6b553e3205bcadd7ae746bd116420e84379ea'
    ],
    [
        'M07',
        '45832_07.mpd',
        68306,
        '5392874df8e921b3a4e9c077bc4216363671ed462fde733c9db31c7277438929'
    ],
    [
        'M08',
        '45832_08.mpd',
        9673,
        '947cd95f4b61d7a31d314ee2075b4223397d4b96a270a448226f3fc29085fb3b'
    ],
    [
        'M09',
        '45832_09.mpd',
        15633,
        'd1b0eb818254f5f249e40763b1a03ab040ddb2a9d05946dc2966a686023c7ec6'
    ],
    [
        'M10',
        '45832_10.mpd',
        21715,
        'f28ebf7cc312942cfb9004fd99a456304702340cdd529d4450a23a2fa080bf7c'
    ],
    [
        'M11',
        '45832_11.mpd',
        20011,
        '05d2ffbeec347d479654561688f9890048fe6db7fe1ca8f44adb476292026cab'
    ],
    [
        'M12',
        '45832_12.mpd',
        14326,
        'd67c1d0c29fc79a63767374d2e46d5b82339e055d616374f42c7c10ead12f5cb'
    ],
    [
        'M13',
        '45832_13.mpd',
        35155,
        '71c01fee1c0b578f7e908aee1fa0bff3619deccd5e59dadf50584b494102ae08'
    ]
] as const;

export const BIOGLOW_EXTERNAL_MPD_INVENTORY = MPD_ASSET_DATA.map(
    ([missionId, fileName, sizeBytes, sha256]) => ({
        missionId,
        fileName,
        localSourcePath: `${BIOGLOW_EXTERNAL_MPD_SOURCE_DIRECTORY}/${fileName}`,
        format: 'LDraw MPD exported by Studio',
        integrity: { algorithm: 'sha256', value: sha256, sizeBytes },
        provenance: {
            status: 'third-party-local-copy-unbundled',
            declaredGeometrySource: `https://komurobo.com/3d/bioglow/${missionId}.io`,
            declaredBy:
                'The MPD header identifies a publicly shared Komurobo BIOGLOW Studio model and an official LEGO Education building-instruction cross-check.',
            usableTerms: 'not-verified'
        },
        importCompatibility: {
            status: 'manual-import-compatible',
            route: 'Load Scene > Load object file > select the MPD',
            parser: 'The existing LDraw MPD parser reads the root model and embedded submodels.',
            dependencyClosure:
                'The checked-in static/ldraw dependency manifest records a resolved dependency closure for these M01-M13 root filenames.',
            bundledPhysicsSidecar: `src/lib/physics/model-sidecars/${fileName.replace('.mpd', '.physics.json')}`,
            limitation:
                'Selecting an MPD may attach the existing bundled sidecar. That sidecar remains separately unverified and does not make the imported asset mechanically accurate.'
        },
        admission: {
            geometry: 'unverified-third-party',
            fieldRegistration: 'not-recorded',
            mechanics: 'not-admitted',
            calibration: 'not-calibrated',
            redistribution: 'not-approved'
        }
    })
);

export type BioglowExternalMpdInventoryEntry = (typeof BIOGLOW_EXTERNAL_MPD_INVENTORY)[number];

export function findBioglowExternalMpdAsset(
    fileName: string
): BioglowExternalMpdInventoryEntry | undefined {
    return BIOGLOW_EXTERNAL_MPD_INVENTORY.find(
        (asset) => asset.fileName.toLowerCase() === fileName.toLowerCase()
    );
}
