export const BIOGLOW_MISSION_IDS = [
    'M01',
    'M02',
    'M03',
    'M04',
    'M05',
    'M06',
    'M07',
    'M08',
    'M09',
    'M10',
    'M11',
    'M12',
    'M13'
] as const;

export const MISSION_MECHANICS_EVIDENCE_SOURCE_KINDS = [
    'official-video',
    'official-build-instructions',
    'mpd',
    'measurement'
] as const;

export const MISSION_MECHANICS_EVIDENCE_ADMISSION_STATUSES = [
    'not-admitted',
    'mechanics-evidence-admitted',
    'calibrated-physics-admitted',
    'rejected'
] as const;

export const MISSION_MECHANICS_CLAIM_STATES = [
    'unverified',
    'measurement-backed',
    'calibrated-physics-admitted'
] as const;

export const MISSION_MECHANICS_EVIDENCE_INTAKE_SCHEMA = {
    recordVersion: 1,
    sourceUrlProtocols: ['https:', 'file:'],
    sourceKinds: MISSION_MECHANICS_EVIDENCE_SOURCE_KINDS,
    admissionStatuses: MISSION_MECHANICS_EVIDENCE_ADMISSION_STATUSES,
    claimStates: MISSION_MECHANICS_CLAIM_STATES,
    calibrationSafety:
        'Official video, build-instruction, and MPD observations may support unverified mechanics claims, but only measurement sources may support measurement-backed or calibrated physics claims.'
} as const;

export type BioglowMissionId = (typeof BIOGLOW_MISSION_IDS)[number];
export type MissionMechanicsEvidenceSourceKind =
    (typeof MISSION_MECHANICS_EVIDENCE_SOURCE_KINDS)[number];
export type MissionMechanicsEvidenceAdmissionStatus =
    (typeof MISSION_MECHANICS_EVIDENCE_ADMISSION_STATUSES)[number];
export type MissionMechanicsClaimState = (typeof MISSION_MECHANICS_CLAIM_STATES)[number];

export interface MissionMechanicsEvidenceSource {
    id: string;
    kind: MissionMechanicsEvidenceSourceKind;
    url: string;
    title: string;
    locator: string;
}

export interface MissionMechanicsObservedClaim {
    id: string;
    statement: string;
    evidenceSourceIds: readonly string[];
    state: MissionMechanicsClaimState;
    calibrationEvidenceSourceIds: readonly string[];
}

export interface MissionMechanicsUnverifiedClaim {
    id: string;
    statement: string;
    reason: string;
    evidenceSourceIds: readonly string[];
}

export interface MissionMechanicsEvidenceIntake {
    recordVersion: 1;
    missionId: BioglowMissionId;
    reviewer: string;
    reviewedOn: string;
    admissionStatus: MissionMechanicsEvidenceAdmissionStatus;
    sources: readonly MissionMechanicsEvidenceSource[];
    observedClaims: readonly MissionMechanicsObservedClaim[];
    unverifiedClaims: readonly MissionMechanicsUnverifiedClaim[];
}

export class MissionMechanicsEvidenceIntakeValidationError extends Error {
    constructor(readonly issues: readonly string[]) {
        super(`Mission mechanics evidence intake is invalid: ${issues.join('; ')}`);
        this.name = 'MissionMechanicsEvidenceIntakeValidationError';
    }
}

export function validateMissionMechanicsEvidenceIntake(
    input: unknown
): MissionMechanicsEvidenceIntake {
    const issues: string[] = [];
    if (!isRecord(input)) {
        throw new MissionMechanicsEvidenceIntakeValidationError(['record must be an object']);
    }

    if (input.recordVersion !== MISSION_MECHANICS_EVIDENCE_INTAKE_SCHEMA.recordVersion) {
        issues.push('recordVersion must be 1');
    }
    if (!isOneOf(input.missionId, BIOGLOW_MISSION_IDS)) {
        issues.push('missionId must identify one of M01 through M13');
    }
    if (!isNonBlankString(input.reviewer)) {
        issues.push('reviewer must be a non-empty string');
    }
    if (!isIsoDate(input.reviewedOn)) {
        issues.push('reviewedOn must be a valid YYYY-MM-DD date');
    }
    if (!isOneOf(input.admissionStatus, MISSION_MECHANICS_EVIDENCE_ADMISSION_STATUSES)) {
        issues.push('admissionStatus is invalid');
    }

    const sources = validateSources(input.sources, issues);
    const sourceIds = new Set(sources.map(({ id }) => id));
    const sourcesById = new Map(sources.map((source) => [source.id, source]));
    const observedClaims = validateObservedClaims(
        input.observedClaims,
        sourceIds,
        sourcesById,
        issues
    );
    validateUnverifiedClaims(input.unverifiedClaims, sourceIds, issues);
    validateAdmissionStatus(input.admissionStatus, observedClaims, issues);

    if (issues.length > 0) {
        throw new MissionMechanicsEvidenceIntakeValidationError(issues);
    }

    return input as unknown as MissionMechanicsEvidenceIntake;
}

function validateSources(
    input: unknown,
    issues: string[]
): readonly MissionMechanicsEvidenceSource[] {
    if (!Array.isArray(input) || input.length === 0) {
        issues.push('sources must contain at least one source');
        return [];
    }

    const sourceIds = new Set<string>();
    const sources: MissionMechanicsEvidenceSource[] = [];
    for (const [index, source] of input.entries()) {
        if (!isRecord(source)) {
            issues.push(`sources[${index}] must be an object`);
            continue;
        }
        if (!isNonBlankString(source.id)) {
            issues.push(`sources[${index}].id must be a non-empty string`);
        } else if (sourceIds.has(source.id)) {
            issues.push(`sources[${index}].id duplicates ${source.id}`);
        } else {
            sourceIds.add(source.id);
        }
        if (!isOneOf(source.kind, MISSION_MECHANICS_EVIDENCE_SOURCE_KINDS)) {
            issues.push(`sources[${index}].kind is invalid`);
        }
        if (!hasAcceptedUrlProtocol(source.url)) {
            issues.push(`sources[${index}].url must be an absolute https: or file: URL`);
        }
        if (!isNonBlankString(source.title)) {
            issues.push(`sources[${index}].title must be a non-empty string`);
        }
        if (!isNonBlankString(source.locator)) {
            issues.push(`sources[${index}].locator must be a non-empty string`);
        }
        if (
            isNonBlankString(source.id) &&
            isOneOf(source.kind, MISSION_MECHANICS_EVIDENCE_SOURCE_KINDS) &&
            isNonBlankString(source.url) &&
            isNonBlankString(source.title) &&
            isNonBlankString(source.locator)
        ) {
            sources.push(source as unknown as MissionMechanicsEvidenceSource);
        }
    }
    return sources;
}

function validateObservedClaims(
    input: unknown,
    sourceIds: ReadonlySet<string>,
    sourcesById: ReadonlyMap<string, MissionMechanicsEvidenceSource>,
    issues: string[]
): readonly MissionMechanicsObservedClaim[] {
    if (!Array.isArray(input)) {
        issues.push('observedClaims must be an array');
        return [];
    }

    const claimIds = new Set<string>();
    const claims: MissionMechanicsObservedClaim[] = [];
    for (const [index, claim] of input.entries()) {
        if (!isRecord(claim)) {
            issues.push(`observedClaims[${index}] must be an object`);
            continue;
        }
        validateClaimIdentity(claim, index, claimIds, 'observedClaims', issues);
        if (!isNonBlankString(claim.statement)) {
            issues.push(`observedClaims[${index}].statement must be a non-empty string`);
        }
        validateSourceReferences(
            claim.evidenceSourceIds,
            sourceIds,
            `observedClaims[${index}].evidenceSourceIds`,
            issues
        );
        if (!isOneOf(claim.state, MISSION_MECHANICS_CLAIM_STATES)) {
            issues.push(`observedClaims[${index}].state is invalid`);
        }
        validateCalibrationSources(claim, index, sourceIds, sourcesById, issues);
        if (
            isNonBlankString(claim.id) &&
            isNonBlankString(claim.statement) &&
            isOneOf(claim.state, MISSION_MECHANICS_CLAIM_STATES) &&
            Array.isArray(claim.evidenceSourceIds) &&
            Array.isArray(claim.calibrationEvidenceSourceIds)
        ) {
            claims.push(claim as unknown as MissionMechanicsObservedClaim);
        }
    }
    return claims;
}

function validateClaimIdentity(
    claim: Record<string, unknown>,
    index: number,
    claimIds: Set<string>,
    collectionName: string,
    issues: string[]
): void {
    if (!isNonBlankString(claim.id)) {
        issues.push(`${collectionName}[${index}].id must be a non-empty string`);
    } else if (claimIds.has(claim.id)) {
        issues.push(`${collectionName}[${index}].id duplicates ${claim.id}`);
    } else {
        claimIds.add(claim.id);
    }
}

function validateCalibrationSources(
    claim: Record<string, unknown>,
    index: number,
    sourceIds: ReadonlySet<string>,
    sourcesById: ReadonlyMap<string, MissionMechanicsEvidenceSource>,
    issues: string[]
): void {
    const label = `observedClaims[${index}].calibrationEvidenceSourceIds`;
    validateSourceReferences(claim.calibrationEvidenceSourceIds, sourceIds, label, issues, false);
    const calibrationIds = Array.isArray(claim.calibrationEvidenceSourceIds)
        ? claim.calibrationEvidenceSourceIds
        : [];
    const requiresMeasurement =
        claim.state === 'measurement-backed' || claim.state === 'calibrated-physics-admitted';

    if (requiresMeasurement && calibrationIds.length === 0) {
        issues.push(`${label} must identify a measurement source for ${claim.state} claims`);
    }
    for (const sourceId of calibrationIds) {
        if (
            isNonBlankString(sourceId) &&
            sourceIds.has(sourceId) &&
            sourcesById.get(sourceId)?.kind !== 'measurement'
        ) {
            issues.push(`${label} may only identify sources with kind measurement`);
        }
    }
    if (!requiresMeasurement && calibrationIds.length > 0) {
        issues.push(`${label} must be empty for unverified claims`);
    }
}

function validateUnverifiedClaims(
    input: unknown,
    sourceIds: ReadonlySet<string>,
    issues: string[]
): void {
    if (!Array.isArray(input)) {
        issues.push('unverifiedClaims must be an array');
        return;
    }
    const claimIds = new Set<string>();
    for (const [index, claim] of input.entries()) {
        if (!isRecord(claim)) {
            issues.push(`unverifiedClaims[${index}] must be an object`);
            continue;
        }
        validateClaimIdentity(claim, index, claimIds, 'unverifiedClaims', issues);
        if (!isNonBlankString(claim.statement)) {
            issues.push(`unverifiedClaims[${index}].statement must be a non-empty string`);
        }
        if (!isNonBlankString(claim.reason)) {
            issues.push(`unverifiedClaims[${index}].reason must be a non-empty string`);
        }
        validateSourceReferences(
            claim.evidenceSourceIds,
            sourceIds,
            `unverifiedClaims[${index}].evidenceSourceIds`,
            issues
        );
    }
}

function validateSourceReferences(
    input: unknown,
    sourceIds: ReadonlySet<string>,
    label: string,
    issues: string[],
    required = true
): void {
    if (!Array.isArray(input)) {
        issues.push(`${label} must be an array`);
        return;
    }
    if (required && input.length === 0) {
        issues.push(`${label} must contain at least one source ID`);
    }
    const references = new Set<string>();
    for (const [index, sourceId] of input.entries()) {
        if (!isNonBlankString(sourceId)) {
            issues.push(`${label}[${index}] must be a non-empty string`);
        } else if (references.has(sourceId)) {
            issues.push(`${label}[${index}] duplicates ${sourceId}`);
        } else if (!sourceIds.has(sourceId)) {
            issues.push(`${label}[${index}] references unknown source ${sourceId}`);
        } else {
            references.add(sourceId);
        }
    }
}

function validateAdmissionStatus(
    admissionStatus: unknown,
    claims: readonly MissionMechanicsObservedClaim[],
    issues: string[]
): void {
    const calibratedClaims = claims.filter(({ state }) => state === 'calibrated-physics-admitted');
    if (admissionStatus === 'calibrated-physics-admitted' && calibratedClaims.length === 0) {
        issues.push('calibrated-physics-admitted requires at least one calibrated physics claim');
    }
    if (admissionStatus !== 'calibrated-physics-admitted' && calibratedClaims.length > 0) {
        issues.push(
            'calibrated physics claims require calibrated-physics-admitted admissionStatus'
        );
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isNonBlankString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
    return typeof value === 'string' && values.includes(value as T[number]);
}

function hasAcceptedUrlProtocol(value: unknown): boolean {
    if (!isNonBlankString(value)) {
        return false;
    }
    try {
        return MISSION_MECHANICS_EVIDENCE_INTAKE_SCHEMA.sourceUrlProtocols.includes(
            new URL(value).protocol as 'https:' | 'file:'
        );
    } catch {
        return false;
    }
}

function isIsoDate(value: unknown): value is string {
    if (!isNonBlankString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    return new Date(`${value}T00:00:00.000Z`).toISOString().startsWith(value);
}
