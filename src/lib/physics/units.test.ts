import { describe, expect, it } from 'vitest';
import {
    metresToMillimetres,
    millimetresToMetres,
    quaternionToYawDegrees,
    vectorMetresToMm,
    vectorMmToMetres,
    yawDegreesToQuaternion
} from '$lib/physics/units';

describe('physics units', () => {
    it('converts millimetres and metres without changing axes', () => {
        expect(millimetresToMetres(1250)).toBe(1.25);
        expect(metresToMillimetres(1.25)).toBe(1250);
        expect(vectorMmToMetres({ x: 1000, y: -250, z: 500 })).toEqual({
            x: 1,
            y: -0.25,
            z: 0.5
        });
        expect(vectorMetresToMm({ x: 1, y: -0.25, z: 0.5 })).toEqual({
            x: 1000,
            y: -250,
            z: 500
        });
    });

    it('round-trips yaw through a quaternion', () => {
        for (const yaw of [-179, -90, 0, 45, 90, 179]) {
            expect(quaternionToYawDegrees(yawDegreesToQuaternion(yaw))).toBeCloseTo(yaw, 8);
        }
    });
});
