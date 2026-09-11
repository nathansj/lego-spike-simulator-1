import type { DroneSurveyObservation } from '$lib/fll/drone-survey';
import type { PhysicsQuaternion, PhysicsVector } from '$lib/physics/types';
import type { PhysicsTransform, PhysicsWorld } from '$lib/physics/world';

export const DRONE_SURVEY_OBSERVATION_IDS = {
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
} as const;

export interface DroneSurveyAreaMm {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
}

export interface DroneSurveyObservationGeometry {
    /** Expected LiDAR-map orientation relative to the mat when completely flipped. */
    lidarMapFlippedRotationRelativeToMat: PhysicsQuaternion;
    /** Simulation tolerance, not an official rule dimension. Must be between 0 and pi. */
    maximumLidarMapRotationErrorRadians: number;
    /** Survey-area bounds in the mat body's local x/z frame. No official bounds are supplied here. */
    surveyAreaMm: DroneSurveyAreaMm;
    /** Local point on the scan-marker body used as its tracked footprint center. */
    scanMarkerPointOffsetMm?: PhysicsVector;
    /**
     * Distance from the tracked point that may overlap the survey area. This must be calibrated
     * from authored marker geometry and is not an official tolerance.
     */
    scanMarkerOverlapMarginMm: number;
}

function requireTransform(world: PhysicsWorld, id: string): PhysicsTransform {
    const transform = world.getTransform(id);
    if (!transform) throw new Error(`Missing Drone Survey physics body: ${id}`);
    return transform;
}

function finite(value: number, name: string): void {
    if (!Number.isFinite(value)) throw new Error(`Invalid Drone Survey geometry: ${name}`);
}

function validateGeometry(geometry: DroneSurveyObservationGeometry): void {
    const area = geometry.surveyAreaMm;
    finite(area.minX, 'surveyAreaMm.minX');
    finite(area.maxX, 'surveyAreaMm.maxX');
    finite(area.minZ, 'surveyAreaMm.minZ');
    finite(area.maxZ, 'surveyAreaMm.maxZ');
    if (area.minX > area.maxX || area.minZ > area.maxZ) {
        throw new Error('Invalid Drone Survey geometry: survey area bounds are reversed');
    }
    finite(geometry.maximumLidarMapRotationErrorRadians, 'maximumLidarMapRotationErrorRadians');
    if (
        geometry.maximumLidarMapRotationErrorRadians < 0 ||
        geometry.maximumLidarMapRotationErrorRadians > Math.PI
    ) {
        throw new Error(
            'Invalid Drone Survey geometry: maximumLidarMapRotationErrorRadians must be between 0 and pi'
        );
    }
    finite(geometry.scanMarkerOverlapMarginMm, 'scanMarkerOverlapMarginMm');
    if (geometry.scanMarkerOverlapMarginMm < 0) {
        throw new Error(
            'Invalid Drone Survey geometry: scanMarkerOverlapMarginMm must be nonnegative'
        );
    }
    for (const [axis, value] of Object.entries(
        geometry.scanMarkerPointOffsetMm ?? { x: 0, y: 0, z: 0 }
    )) {
        finite(value, `scanMarkerPointOffsetMm.${axis}`);
    }
    normalized(geometry.lidarMapFlippedRotationRelativeToMat, 'LiDAR flipped rotation');
}

function normalized(rotation: PhysicsQuaternion, name: string): PhysicsQuaternion {
    const magnitude = Math.hypot(rotation.x, rotation.y, rotation.z, rotation.w);
    if (!Number.isFinite(magnitude) || magnitude < 1e-12) {
        throw new Error(`Invalid Drone Survey geometry: ${name}`);
    }
    return {
        x: rotation.x / magnitude,
        y: rotation.y / magnitude,
        z: rotation.z / magnitude,
        w: rotation.w / magnitude
    };
}

function conjugate(rotation: PhysicsQuaternion): PhysicsQuaternion {
    return { x: -rotation.x, y: -rotation.y, z: -rotation.z, w: rotation.w };
}

function multiply(first: PhysicsQuaternion, second: PhysicsQuaternion): PhysicsQuaternion {
    return {
        x: first.w * second.x + first.x * second.w + first.y * second.z - first.z * second.y,
        y: first.w * second.y - first.x * second.z + first.y * second.w + first.z * second.x,
        z: first.w * second.z + first.x * second.y - first.y * second.x + first.z * second.w,
        w: first.w * second.w - first.x * second.x - first.y * second.y - first.z * second.z
    };
}

function rotate(rotation: PhysicsQuaternion, vector: PhysicsVector): PhysicsVector {
    const pureVector = { ...vector, w: 0 };
    const result = multiply(multiply(rotation, pureVector), conjugate(rotation));
    return { x: result.x, y: result.y, z: result.z };
}

function relativeRotation(
    transform: PhysicsTransform,
    reference: PhysicsTransform
): PhysicsQuaternion {
    return normalized(
        multiply(
            conjugate(normalized(reference.rotation, 'mat rotation')),
            normalized(transform.rotation, 'LiDAR map rotation')
        ),
        'relative LiDAR map rotation'
    );
}

function rotationErrorRadians(actual: PhysicsQuaternion, expected: PhysicsQuaternion): number {
    const target = normalized(expected, 'LiDAR flipped rotation');
    const dot = Math.abs(
        actual.x * target.x + actual.y * target.y + actual.z * target.z + actual.w * target.w
    );
    return 2 * Math.acos(Math.min(1, Math.max(-1, dot)));
}

function pointRelativeToReference(
    transform: PhysicsTransform,
    localPointMm: PhysicsVector,
    reference: PhysicsTransform
): PhysicsVector {
    const worldOffset = rotate(
        normalized(transform.rotation, 'scan marker rotation'),
        localPointMm
    );
    const worldPoint = {
        x: transform.positionMm.x + worldOffset.x - reference.positionMm.x,
        y: transform.positionMm.y + worldOffset.y - reference.positionMm.y,
        z: transform.positionMm.z + worldOffset.z - reference.positionMm.z
    };
    return rotate(conjugate(normalized(reference.rotation, 'mat rotation')), worldPoint);
}

function missionModelTouchesEquipment(world: PhysicsWorld): boolean {
    return DRONE_SURVEY_OBSERVATION_IDS.missionModel.some(
        (missionBodyId) =>
            world.getBody(missionBodyId) !== undefined &&
            DRONE_SURVEY_OBSERVATION_IDS.equipment.some((equipmentBodyId) =>
                world.bodiesAreTouching(missionBodyId, equipmentBodyId)
            )
    );
}

/**
 * Reads end-state observations from deterministic physics state only. The body mappings match the
 * current M01 fixture/sidecar. Geometry is mandatory because the repository has no calibrated or
 * official flip tolerance, survey-area bounds, or scan-marker footprint dimensions.
 */
export function observeDroneSurvey(
    world: PhysicsWorld,
    geometry: DroneSurveyObservationGeometry
): DroneSurveyObservation {
    validateGeometry(geometry);
    const mat = requireTransform(world, DRONE_SURVEY_OBSERVATION_IDS.mat);
    const lidarMap = requireTransform(world, DRONE_SURVEY_OBSERVATION_IDS.lidarMap);
    const scanMarker = requireTransform(world, DRONE_SURVEY_OBSERVATION_IDS.scanMarker);
    requireTransform(world, DRONE_SURVEY_OBSERVATION_IDS.drone);
    for (const equipmentBodyId of DRONE_SURVEY_OBSERVATION_IDS.equipment) {
        requireTransform(world, equipmentBodyId);
    }

    const lidarRotation = relativeRotation(lidarMap, mat);
    const scanMarkerPoint = pointRelativeToReference(
        scanMarker,
        geometry.scanMarkerPointOffsetMm ?? { x: 0, y: 0, z: 0 },
        mat
    );
    const area = geometry.surveyAreaMm;
    const margin = geometry.scanMarkerOverlapMarginMm;

    return {
        droneNoLongerTouchingMat: !world.bodiesAreTouching(
            DRONE_SURVEY_OBSERVATION_IDS.drone,
            DRONE_SURVEY_OBSERVATION_IDS.mat
        ),
        lidarMapCompletelyFlipped:
            rotationErrorRadians(lidarRotation, geometry.lidarMapFlippedRotationRelativeToMat) <=
            geometry.maximumLidarMapRotationErrorRadians,
        scanMarkerAtLeastPartlyInSurveyArea:
            scanMarkerPoint.x >= area.minX - margin &&
            scanMarkerPoint.x <= area.maxX + margin &&
            scanMarkerPoint.z >= area.minZ - margin &&
            scanMarkerPoint.z <= area.maxZ + margin,
        missionModelTouchingEquipmentAtEnd: missionModelTouchesEquipment(world)
    };
}
