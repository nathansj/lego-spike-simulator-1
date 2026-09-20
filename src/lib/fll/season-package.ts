import {
    BIOGLOW_CATALOG_VERIFIED_ON,
    BIOGLOW_FOUNDERS_EDITION,
    BIOGLOW_MISSION_CATALOG,
    BIOGLOW_SOURCE_URLS,
    type BioglowMissionCatalogEntry,
    type ReadinessStatus
} from '$lib/fll/bioglow-mission-catalog';
import { BIOGLOW_MATCH_RULES } from '$lib/fll/bioglow-match-rules';

export const SEASON_PACKAGE_SCHEMA_VERSION = 1 as const;
export const BIOGLOW_FOUNDERS_SEASON_ID = 'bioglow-founders-2026-27' as const;
export const DEFAULT_SEASON_PACKAGE_ID = BIOGLOW_FOUNDERS_SEASON_ID;

export type SeasonPackageCapabilityStatus = ReadinessStatus | 'calibrated' | 'partial';

export interface SeasonPackageSource {
    title: string;
    url: string;
    revision: string;
    verifiedOn: string;
}

export interface SeasonPackageProvenance {
    verifiedOn: string;
    sources: readonly SeasonPackageSource[];
}

export interface SeasonFieldDimensions {
    matWidthMm: number;
    matHeightMm: number;
    tableWidthMm: number;
    tableHeightMm: number;
    boundaryHeightMm: number;
}

export interface SeasonMissionCapabilities {
    assets: SeasonPackageCapabilityStatus;
    mechanics: SeasonPackageCapabilityStatus;
    scoring: SeasonPackageCapabilityStatus;
    physicalCalibration: 'unverified' | 'calibrated';
}

export interface SeasonMission {
    id: string;
    name: string;
    capabilities: SeasonMissionCapabilities;
    assetPaths: readonly string[];
}

export interface SeasonPackage {
    schemaVersion: typeof SEASON_PACKAGE_SCHEMA_VERSION;
    id: string;
    name: string;
    edition: string;
    revision: string;
    platform: 'SPIKE Prime';
    field: SeasonFieldDimensions;
    match: {
        durationSeconds: number;
        ruleSources: readonly SeasonPackageSource[];
    };
    missions: readonly SeasonMission[];
    provenance: SeasonPackageProvenance;
}

function source(title: string, url: string, revision: string): SeasonPackageSource {
    return {
        title,
        url,
        revision,
        verifiedOn: BIOGLOW_CATALOG_VERIFIED_ON
    };
}

function assetStatus(entry: BioglowMissionCatalogEntry): SeasonPackageCapabilityStatus {
    return entry.readiness.repositoryAssetPresence.status;
}

function mechanicsStatus(entry: BioglowMissionCatalogEntry): SeasonPackageCapabilityStatus {
    return entry.readiness.mechanics.status;
}

function scoringStatus(entry: BioglowMissionCatalogEntry): SeasonPackageCapabilityStatus {
    return entry.readiness.scoring.status;
}

function mission(entry: BioglowMissionCatalogEntry): SeasonMission {
    return {
        id: entry.id,
        name: entry.name,
        capabilities: {
            assets: assetStatus(entry),
            mechanics: mechanicsStatus(entry),
            scoring: scoringStatus(entry),
            physicalCalibration: 'unverified'
        },
        assetPaths: entry.readiness.repositoryAssetPresence.paths
    };
}

const seasonMaterials = source(
    'FIRST LEGO League BIOGLOW Season Materials',
    BIOGLOW_SOURCE_URLS.seasonMaterials,
    'Season materials index checked 2026-09-11'
);

const rulebook = source(
    'FIRST LEGO League Challenge BIOGLOW Robot Game Rulebook',
    BIOGLOW_SOURCE_URLS.rulebook,
    '©2026 FIRST and the LEGO Group; document revision not displayed'
);

const challengeUpdates = source(
    'FIRST LEGO League Challenge BIOGLOW Challenge Updates',
    BIOGLOW_SOURCE_URLS.challengeUpdates,
    'Update 01, 2026-09-02'
);

export const BIOGLOW_FOUNDERS_SEASON_PACKAGE: SeasonPackage = {
    schemaVersion: SEASON_PACKAGE_SCHEMA_VERSION,
    id: BIOGLOW_FOUNDERS_SEASON_ID,
    name: BIOGLOW_FOUNDERS_EDITION,
    edition: 'Founders Edition',
    revision: '2026-09-11 catalog; Update 01 2026-09-02',
    platform: 'SPIKE Prime',
    field: {
        matWidthMm: 2360,
        matHeightMm: 1140,
        tableWidthMm: 2434,
        tableHeightMm: 1145,
        boundaryHeightMm: 50
    },
    match: {
        durationSeconds: BIOGLOW_MATCH_RULES.duration.seconds,
        ruleSources: [rulebook, challengeUpdates]
    },
    missions: BIOGLOW_MISSION_CATALOG.map(mission),
    provenance: {
        verifiedOn: BIOGLOW_CATALOG_VERIFIED_ON,
        sources: [seasonMaterials, rulebook, challengeUpdates]
    }
};

const SEASON_PACKAGES: Readonly<Record<string, SeasonPackage>> = {
    [BIOGLOW_FOUNDERS_SEASON_ID]: BIOGLOW_FOUNDERS_SEASON_PACKAGE
};

export const AVAILABLE_SEASON_PACKAGES: readonly SeasonPackage[] = Object.freeze(
    Object.values(SEASON_PACKAGES)
);

export function listSeasonPackages(): readonly SeasonPackage[] {
    return AVAILABLE_SEASON_PACKAGES;
}

export function getSeasonPackage(seasonId: string): SeasonPackage | undefined {
    return SEASON_PACKAGES[seasonId];
}

export function getDefaultSeasonPackage(): SeasonPackage {
    return SEASON_PACKAGES[DEFAULT_SEASON_PACKAGE_ID];
}

export function getMissionFromSeasonPackage(
    seasonPackage: SeasonPackage,
    missionId: string
): SeasonMission | undefined {
    return seasonPackage.missions.find((entry) => entry.id === missionId);
}
