import type { PhysicsQuaternion, PhysicsVector } from '$lib/physics/types';

export const MILLIMETRES_PER_METRE = 1000;

export function millimetresToMetres(value: number): number {
    return value / MILLIMETRES_PER_METRE;
}

export function metresToMillimetres(value: number): number {
    return value * MILLIMETRES_PER_METRE;
}

export function vectorMmToMetres(vector: PhysicsVector): PhysicsVector {
    return {
        x: millimetresToMetres(vector.x),
        y: millimetresToMetres(vector.y),
        z: millimetresToMetres(vector.z)
    };
}

export function vectorMetresToMm(vector: PhysicsVector): PhysicsVector {
    return {
        x: metresToMillimetres(vector.x),
        y: metresToMillimetres(vector.y),
        z: metresToMillimetres(vector.z)
    };
}

export function yawDegreesToQuaternion(yawDegrees: number): PhysicsQuaternion {
    const halfAngle = (yawDegrees * Math.PI) / 360;
    return { x: 0, y: Math.sin(halfAngle), z: 0, w: Math.cos(halfAngle) };
}

export function quaternionToYawDegrees(rotation: PhysicsQuaternion): number {
    const sinYaw = 2 * (rotation.w * rotation.y + rotation.x * rotation.z);
    const cosYaw = 1 - 2 * (rotation.y * rotation.y + rotation.z * rotation.z);
    return (Math.atan2(sinYaw, cosYaw) * 180) / Math.PI;
}
