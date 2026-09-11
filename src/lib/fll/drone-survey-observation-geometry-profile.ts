import type { PhysicsQuaternion, PhysicsVector } from '$lib/physics/types';
import type {
    DroneSurveyAreaMm,
    DroneSurveyObservationGeometry
} from '$lib/fll/drone-survey-observations';

export const DRONE_SURVEY_OBSERVATION_GEOMETRY_PROFILE_VERSION = 1 as const;

export type DroneSurveyObservationGeometryCalibrationStatus = 'unverified' | 'calibrated';

export interface DroneSurveyObservationGeometryProfileProvenance {
    /** Source document, measurement set, or authored asset that supplied the geometry. */
    source: string;
    /** Revision or other immutable identifier for `source`. */
    sourceVersion: string;
    /** ISO calendar date (`YYYY-MM-DD`) on which the source was recorded. */
    recordedOn: string;
}

export interface DroneSurveyObservationGeometryProfileCalibration {
    /** Calibration evidence status; this is a declaration, not evidence by itself. */
    status: DroneSurveyObservationGeometryCalibrationStatus;
    /** Measurement evidence or an explicit reason that calibration remains unverified. */
    evidence: string;
}

/**
 * The observation adapter permits an omitted scan-marker offset for direct callers. Persisted
 * profiles do not: every value is required so loading one can never introduce an implicit offset.
 * Distances remain millimeters and the LiDAR-map error remains radians.
 */
export interface DroneSurveyObservationGeometryProfileGeometry
    extends DroneSurveyObservationGeometry {
    lidarMapFlippedRotationRelativeToMat: PhysicsQuaternion;
    maximumLidarMapRotationErrorRadians: number;
    surveyAreaMm: DroneSurveyAreaMm;
    scanMarkerPointOffsetMm: PhysicsVector;
    scanMarkerOverlapMarginMm: number;
}

/** Versioned, explicit geometry input for the M01 Drone Survey observation adapter. */
export interface DroneSurveyObservationGeometryProfile {
    profileVersion: typeof DRONE_SURVEY_OBSERVATION_GEOMETRY_PROFILE_VERSION;
    missionId: 'M01';
    provenance: DroneSurveyObservationGeometryProfileProvenance;
    calibration: DroneSurveyObservationGeometryProfileCalibration;
    geometry: DroneSurveyObservationGeometryProfileGeometry;
}

const PROFILE_NAME = 'Drone Survey observation geometry profile';

type JsonRecord = Record<string, unknown>;

function invalid(message: string): never {
    throw new Error(`Invalid ${PROFILE_NAME}: ${message}`);
}

function readRecord(value: unknown, path: string, keys: readonly string[]): JsonRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        invalid(`${path} must be an object`);
    }
    const record = value as JsonRecord;
    const actualKeys = Object.keys(record);
    if (
        actualKeys.length !== keys.length ||
        actualKeys.some((key) => !keys.includes(key)) ||
        keys.some((key) => !Object.hasOwn(record, key))
    ) {
        invalid(`${path} must contain exactly: ${keys.join(', ')}`);
    }
    return record;
}

function readFiniteNumber(value: unknown, path: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        invalid(`${path} must be a finite number`);
    }
    return value;
}

function readNonEmptyString(value: unknown, path: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        invalid(`${path} must be a non-empty string`);
    }
    return value;
}

function readIsoDate(value: unknown, path: string): string {
    const date = readNonEmptyString(value, path);
    const timestamp = Date.parse(`${date}T00:00:00Z`);
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(timestamp) ||
        new Date(timestamp).toISOString().slice(0, 10) !== date
    ) {
        invalid(`${path} must be an ISO calendar date`);
    }
    return date;
}

function readVector(value: unknown, path: string): PhysicsVector {
    const vector = readRecord(value, path, ['x', 'y', 'z']);
    return {
        x: readFiniteNumber(vector.x, `${path}.x`),
        y: readFiniteNumber(vector.y, `${path}.y`),
        z: readFiniteNumber(vector.z, `${path}.z`)
    };
}

function readQuaternion(value: unknown, path: string): PhysicsQuaternion {
    const rotation = readRecord(value, path, ['x', 'y', 'z', 'w']);
    const result = {
        x: readFiniteNumber(rotation.x, `${path}.x`),
        y: readFiniteNumber(rotation.y, `${path}.y`),
        z: readFiniteNumber(rotation.z, `${path}.z`),
        w: readFiniteNumber(rotation.w, `${path}.w`)
    };
    const magnitude = Math.hypot(result.x, result.y, result.z, result.w);
    if (!Number.isFinite(magnitude) || magnitude < 1e-12) {
        invalid(`${path} must not be a zero quaternion`);
    }
    return result;
}

function readArea(value: unknown): DroneSurveyAreaMm {
    const area = readRecord(value, 'geometry.surveyAreaMm', ['minX', 'maxX', 'minZ', 'maxZ']);
    const result = {
        minX: readFiniteNumber(area.minX, 'geometry.surveyAreaMm.minX'),
        maxX: readFiniteNumber(area.maxX, 'geometry.surveyAreaMm.maxX'),
        minZ: readFiniteNumber(area.minZ, 'geometry.surveyAreaMm.minZ'),
        maxZ: readFiniteNumber(area.maxZ, 'geometry.surveyAreaMm.maxZ')
    };
    if (result.minX > result.maxX || result.minZ > result.maxZ) {
        invalid('geometry.surveyAreaMm bounds must not be reversed');
    }
    return result;
}

function readGeometry(value: unknown): DroneSurveyObservationGeometryProfileGeometry {
    const geometry = readRecord(value, 'geometry', [
        'lidarMapFlippedRotationRelativeToMat',
        'maximumLidarMapRotationErrorRadians',
        'surveyAreaMm',
        'scanMarkerPointOffsetMm',
        'scanMarkerOverlapMarginMm'
    ]);
    const maximumLidarMapRotationErrorRadians = readFiniteNumber(
        geometry.maximumLidarMapRotationErrorRadians,
        'geometry.maximumLidarMapRotationErrorRadians'
    );
    if (maximumLidarMapRotationErrorRadians < 0 || maximumLidarMapRotationErrorRadians > Math.PI) {
        invalid('geometry.maximumLidarMapRotationErrorRadians must be between 0 and pi');
    }
    const scanMarkerOverlapMarginMm = readFiniteNumber(
        geometry.scanMarkerOverlapMarginMm,
        'geometry.scanMarkerOverlapMarginMm'
    );
    if (scanMarkerOverlapMarginMm < 0) {
        invalid('geometry.scanMarkerOverlapMarginMm must be nonnegative');
    }
    return {
        lidarMapFlippedRotationRelativeToMat: readQuaternion(
            geometry.lidarMapFlippedRotationRelativeToMat,
            'geometry.lidarMapFlippedRotationRelativeToMat'
        ),
        maximumLidarMapRotationErrorRadians,
        surveyAreaMm: readArea(geometry.surveyAreaMm),
        scanMarkerPointOffsetMm: readVector(
            geometry.scanMarkerPointOffsetMm,
            'geometry.scanMarkerPointOffsetMm'
        ),
        scanMarkerOverlapMarginMm
    };
}

/**
 * Validates an already-decoded JSON value and returns a detached, fully explicit profile.
 * It neither infers values nor converts the millimeter and radian values supplied by the source.
 */
export function validateDroneSurveyObservationGeometryProfile(
    value: unknown
): DroneSurveyObservationGeometryProfile {
    const profile = readRecord(value, 'profile', [
        'profileVersion',
        'missionId',
        'provenance',
        'calibration',
        'geometry'
    ]);
    if (profile.profileVersion !== DRONE_SURVEY_OBSERVATION_GEOMETRY_PROFILE_VERSION) {
        invalid(`unsupported profileVersion: ${String(profile.profileVersion)}`);
    }
    if (profile.missionId !== 'M01') invalid('missionId must be M01');

    const provenance = readRecord(profile.provenance, 'provenance', [
        'source',
        'sourceVersion',
        'recordedOn'
    ]);
    const calibration = readRecord(profile.calibration, 'calibration', ['status', 'evidence']);
    if (calibration.status !== 'unverified' && calibration.status !== 'calibrated') {
        invalid('calibration.status must be unverified or calibrated');
    }

    return {
        profileVersion: DRONE_SURVEY_OBSERVATION_GEOMETRY_PROFILE_VERSION,
        missionId: 'M01',
        provenance: {
            source: readNonEmptyString(provenance.source, 'provenance.source'),
            sourceVersion: readNonEmptyString(provenance.sourceVersion, 'provenance.sourceVersion'),
            recordedOn: readIsoDate(provenance.recordedOn, 'provenance.recordedOn')
        },
        calibration: {
            status: calibration.status,
            evidence: readNonEmptyString(calibration.evidence, 'calibration.evidence')
        },
        geometry: readGeometry(profile.geometry)
    };
}

/** Parses strict JSON and validates the versioned M01 geometry profile without supplying defaults. */
export function parseDroneSurveyObservationGeometryProfile(
    json: string
): DroneSurveyObservationGeometryProfile {
    let value: unknown;
    try {
        value = JSON.parse(json);
    } catch {
        invalid('invalid JSON');
    }
    return validateDroneSurveyObservationGeometryProfile(value);
}
