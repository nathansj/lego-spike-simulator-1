import type {
    SeasonMission,
    SeasonPackageCapabilityStatus
} from '$lib/fll/season-package';

export type MissionCapabilityKey =
    | 'assets'
    | 'mechanics'
    | 'scoring'
    | 'physicalCalibration';

export type MissionReadinessLevel = 'ready' | 'practice-only' | 'needs-setup';

export interface MissionCapabilityReadiness {
    key: MissionCapabilityKey;
    label: string;
    status: SeasonPackageCapabilityStatus;
    statusLabel: string;
    action: string;
}

export interface MissionReadinessSummary {
    level: MissionReadinessLevel;
    headline: string;
    explanation: string;
    capabilities: readonly MissionCapabilityReadiness[];
}

const capabilityLabels: Record<MissionCapabilityKey, string> = {
    assets: 'Mission assets',
    mechanics: 'Mechanics',
    scoring: 'Scoring',
    physicalCalibration: 'Physical calibration'
};

function statusLabel(status: SeasonPackageCapabilityStatus): string {
    switch (status) {
        case 'implemented':
            return 'Implemented';
        case 'verified':
            return 'Verified';
        case 'calibrated':
            return 'Calibrated';
        case 'located':
            return 'References found';
        case 'partial':
            return 'Partial';
        case 'unverified':
            return 'Unverified';
        case 'unavailable':
            return 'Unavailable';
        case 'not-implemented':
            return 'Not implemented';
    }
}

function actionFor(key: MissionCapabilityKey, status: SeasonPackageCapabilityStatus): string {
    if (status === 'verified' || status === 'implemented' || status === 'calibrated') {
        return 'No action needed for this capability.';
    }
    switch (key) {
        case 'assets':
            return status === 'unavailable'
                ? 'Load or create the mission model asset before practicing it.'
                : 'Review the mission asset evidence before relying on the model.';
        case 'mechanics':
            return status === 'unavailable'
                ? 'Add the mission model and its mechanical evidence before using motion.'
                : 'Review construction, joints, and collider evidence before relying on motion.';
        case 'scoring':
            return status === 'not-implemented'
                ? 'Use this as visual practice; no official score is recorded.'
                : 'Review the scoring contract before treating results as official.';
        case 'physicalCalibration':
            return 'Calibrate against a physical field and robot before treating motion as real-world accurate.';
    }
}

export function missionReadiness(mission: SeasonMission): MissionReadinessSummary {
    const statuses: Record<MissionCapabilityKey, SeasonPackageCapabilityStatus> = {
        assets: mission.capabilities.assets,
        mechanics: mission.capabilities.mechanics,
        scoring: mission.capabilities.scoring,
        physicalCalibration: mission.capabilities.physicalCalibration
    };
    const capabilities = (Object.keys(statuses) as MissionCapabilityKey[]).map((key) => ({
        key,
        label: capabilityLabels[key],
        status: statuses[key],
        statusLabel: statusLabel(statuses[key]),
        action: actionFor(key, statuses[key])
    }));
    const needsSetup = capabilities.some(
        ({ status }) => status === 'unavailable' || status === 'partial'
    );
    const practiceOnly = capabilities.some(
        ({ status }) =>
            status === 'unverified' ||
            status === 'not-implemented' ||
            status === 'located'
    );
    if (needsSetup) {
        return {
            level: 'needs-setup',
            headline: 'Needs setup before mission practice',
            explanation: 'One or more required mission capabilities are unavailable or partial.',
            capabilities
        };
    }
    if (practiceOnly) {
        return {
            level: 'practice-only',
            headline: 'Practice evidence is incomplete',
            explanation:
                'You can inspect or practice this mission, but the simulator does not establish official scoring or physical accuracy.',
            capabilities
        };
    }
    return {
        level: 'ready',
        headline: 'Ready for supported simulator practice',
        explanation: 'All listed package capabilities are marked complete.',
        capabilities
    };
}
