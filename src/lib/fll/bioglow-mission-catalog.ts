/**
 * Source-backed readiness inventory for the 2026-27 BIOGLOW Founders Edition
 * Challenge. Asset presence only records this checkout; it is not evidence of
 * official geometry, calibrated mechanics, or a score implementation.
 */

export const BIOGLOW_FOUNDERS_EDITION = 'BIOGLOW Founders Edition Challenge 2026-27' as const;
export const BIOGLOW_CATALOG_VERIFIED_ON = '2026-09-11' as const;

export const BIOGLOW_SOURCE_URLS = {
    seasonMaterials: 'https://www.firstinspires.org/resources/library/fll/season-materials',
    rulebook:
        'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-rgr.pdf',
    challengeUpdates:
        'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-updates.pdf',
    softwareScoresheet:
        'https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-software-scoresheet.pdf',
    regionalMissionIndex:
        'https://education.theiet.org/first-lego-league-programmes/challenge/about-first-lego-league-challenge/host-resources'
} as const;

export type BioglowMissionId = `M${string}`;
export type ReadinessStatus =
    | 'verified'
    | 'located'
    | 'unverified'
    | 'unavailable'
    | 'implemented'
    | 'not-implemented';

export interface MissionSource {
    title: string;
    url: string;
    locator: string;
    verifiedOn: typeof BIOGLOW_CATALOG_VERIFIED_ON;
}

export interface BioglowMissionReadiness {
    officialRuleSourceCoverage: {
        status: Extract<ReadinessStatus, 'verified' | 'located' | 'unverified'>;
        detail: string;
        sources: readonly MissionSource[];
    };
    repositoryAssetPresence: {
        status: Extract<ReadinessStatus, 'verified' | 'unavailable'>;
        paths: readonly string[];
        detail: string;
    };
    mechanics: {
        status: Extract<ReadinessStatus, 'unverified' | 'unavailable'>;
        detail: string;
    };
    scoring: {
        status: Extract<ReadinessStatus, 'implemented' | 'not-implemented'>;
        detail: string;
    };
}

export interface BioglowMissionCatalogEntry {
    id: BioglowMissionId;
    name: string;
    readiness: BioglowMissionReadiness;
}

const scoreSheetSource = (missionNumber: string, missionName: string): MissionSource => ({
    title: 'FIRST LEGO League Challenge BIOGLOW Software Scoresheet',
    url: BIOGLOW_SOURCE_URLS.softwareScoresheet,
    locator: `MISSION ${missionNumber} ${missionName.toUpperCase()}`,
    verifiedOn: BIOGLOW_CATALOG_VERIFIED_ON
});

const regionalMissionIndexSource: MissionSource = {
    title: 'IET FIRST LEGO League Challenge BIOGLOW mission model building instructions',
    url: BIOGLOW_SOURCE_URLS.regionalMissionIndex,
    locator: 'Mission model building instructions',
    verifiedOn: BIOGLOW_CATALOG_VERIFIED_ON
};

function ruleCoverage(
    missionNumber: string,
    missionName: string,
    extraSources: MissionSource[] = [],
    status: 'verified' | 'located' = 'located'
) {
    return {
        status,
        detail: 'The FIRST software scoresheet lists this mission identity and score-sheet observables; the IET regional program partner mission index provides a supporting model reference. Full rulebook coverage is tracked separately.',
        sources: [
            scoreSheetSource(missionNumber, missionName),
            regionalMissionIndexSource,
            ...extraSources
        ]
    };
}

function sidecarAsset(missionNumber: string) {
    const path = `src/lib/physics/model-sidecars/45832_${missionNumber}.physics.json`;
    return {
        status: 'verified' as const,
        paths: [path],
        detail: 'A repository physics sidecar is present. Its presence does not verify the official model geometry.'
    };
}

const absentAsset = {
    status: 'unavailable' as const,
    paths: [],
    detail: 'No corresponding mission sidecar is present in this checkout.'
};

const sidecarMechanics = {
    status: 'unverified' as const,
    detail: 'A sidecar labels a proposed mechanism, but its geometry, joint behavior, and calibration are not verified against official sources.'
};

const absentMechanics = {
    status: 'unavailable' as const,
    detail: 'No repository mission asset is available to model or verify this mission mechanism.'
};

const unimplementedScoring = {
    status: 'not-implemented' as const,
    detail: 'No mission scorer or end-of-match observation contract is implemented in the repository.'
};

const m02ScoringFoundation = {
    status: 'not-implemented' as const,
    detail: 'A source-backed M02 scorer, end-of-match contract, and fail-closed observation boundary exist, but no authoritative physics observation or global match adjudicator is connected.'
};

export const BIOGLOW_MISSION_CATALOG = [
    {
        id: 'M01',
        name: 'Drone Survey',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage(
                '01',
                'Drone Survey',
                [
                    {
                        title: 'FIRST LEGO League Challenge BIOGLOW Robot Game Rulebook',
                        url: BIOGLOW_SOURCE_URLS.rulebook,
                        locator: 'page 9, Mission 01: Drone Survey',
                        verifiedOn: BIOGLOW_CATALOG_VERIFIED_ON
                    }
                ],
                'verified'
            ),
            repositoryAssetPresence: sidecarAsset('01'),
            mechanics: sidecarMechanics,
            scoring: {
                status: 'implemented',
                detail: 'src/lib/fll/drone-survey.ts implements a source-backed end-of-match scorer; its geometry inputs remain explicitly unverified.'
            }
        }
    },
    {
        id: 'M02',
        name: 'Exploding Seeds',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage('02', 'Exploding Seeds'),
            repositoryAssetPresence: sidecarAsset('02'),
            mechanics: sidecarMechanics,
            scoring: m02ScoringFoundation
        }
    },
    {
        id: 'M03',
        name: 'Flip the Rock',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage('03', 'Flip the Rock'),
            repositoryAssetPresence: sidecarAsset('03'),
            mechanics: sidecarMechanics,
            scoring: unimplementedScoring
        }
    },
    {
        id: 'M04',
        name: 'Lucky Leaves',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage('04', 'Lucky Leaves', [
                {
                    title: 'FIRST LEGO League Challenge Updates, Update 01',
                    url: BIOGLOW_SOURCE_URLS.challengeUpdates,
                    locator: 'updated September 2, 2026; Lucky Leaves replacement constraints',
                    verifiedOn: BIOGLOW_CATALOG_VERIFIED_ON
                }
            ]),
            repositoryAssetPresence: sidecarAsset('04'),
            mechanics: sidecarMechanics,
            scoring: unimplementedScoring
        }
    },
    {
        id: 'M05',
        name: 'Reaching Rods',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage('05', 'Reaching Rods'),
            repositoryAssetPresence: sidecarAsset('05'),
            mechanics: sidecarMechanics,
            scoring: unimplementedScoring
        }
    },
    {
        id: 'M06',
        name: 'Leafcutter Frenzy',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage('06', 'Leafcutter Frenzy'),
            repositoryAssetPresence: sidecarAsset('06'),
            mechanics: sidecarMechanics,
            scoring: unimplementedScoring
        }
    },
    {
        id: 'M07',
        name: 'Humongous Fungus',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage('07', 'Humongous Fungus'),
            repositoryAssetPresence: sidecarAsset('07'),
            mechanics: sidecarMechanics,
            scoring: unimplementedScoring
        }
    },
    {
        id: 'M08',
        name: 'Tangled',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage('08', 'Tangled'),
            repositoryAssetPresence: sidecarAsset('08'),
            mechanics: sidecarMechanics,
            scoring: unimplementedScoring
        }
    },
    {
        id: 'M09',
        name: 'Research Platform',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage('09', 'Research Platform'),
            repositoryAssetPresence: sidecarAsset('09'),
            mechanics: sidecarMechanics,
            scoring: unimplementedScoring
        }
    },
    {
        id: 'M10',
        name: 'Fragile Microhabitats',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage('10', 'Fragile Microhabitats'),
            repositoryAssetPresence: sidecarAsset('10'),
            mechanics: sidecarMechanics,
            scoring: unimplementedScoring
        }
    },
    {
        id: 'M11',
        name: 'Window to the Past',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage('11', 'Window to the Past'),
            repositoryAssetPresence: sidecarAsset('11'),
            mechanics: sidecarMechanics,
            scoring: unimplementedScoring
        }
    },
    {
        id: 'M12',
        name: 'Forest Elder',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage('12', 'Forest Elder'),
            repositoryAssetPresence: sidecarAsset('12'),
            mechanics: sidecarMechanics,
            scoring: unimplementedScoring
        }
    },
    {
        id: 'M13',
        name: 'Keystone Species',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage('13', 'Keystone Species'),
            repositoryAssetPresence: sidecarAsset('13'),
            mechanics: sidecarMechanics,
            scoring: unimplementedScoring
        }
    },
    {
        id: 'M14',
        name: 'Seeds of Renewal',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage('14', 'Seeds of Renewal'),
            repositoryAssetPresence: absentAsset,
            mechanics: absentMechanics,
            scoring: unimplementedScoring
        }
    },
    {
        id: 'M15',
        name: 'Biocentric Architecture',
        readiness: {
            officialRuleSourceCoverage: ruleCoverage('15', 'Biocentric Architecture'),
            repositoryAssetPresence: absentAsset,
            mechanics: absentMechanics,
            scoring: unimplementedScoring
        }
    }
] as const satisfies readonly BioglowMissionCatalogEntry[];

export type BioglowMissionCatalog = typeof BIOGLOW_MISSION_CATALOG;
