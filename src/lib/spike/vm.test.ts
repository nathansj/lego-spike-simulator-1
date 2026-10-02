import { describe, expect, it } from 'vitest';
import { movementTargetMm } from '$lib/spike/vm';

describe('movementTargetMm', () => {
    const moveDistanceMm = 175;

    it('converts centimetres to millimetres', () => {
        expect(movementTargetMm(10, 'cm', moveDistanceMm)).toBeCloseTo(100, 6);
    });

    it('converts inches to millimetres', () => {
        expect(movementTargetMm(2, 'in', moveDistanceMm)).toBeCloseTo(50.8, 6);
        expect(movementTargetMm(2, 'inches', moveDistanceMm)).toBeCloseTo(50.8, 6);
    });

    it('converts rotations and degrees using the movement distance', () => {
        expect(movementTargetMm(2, 'rotations', moveDistanceMm)).toBeCloseTo(350, 6);
        expect(movementTargetMm(180, 'degrees', moveDistanceMm)).toBeCloseTo(87.5, 6);
    });

    it('ignores units that are not distances', () => {
        expect(movementTargetMm(1, 'seconds', moveDistanceMm)).toBe(0);
    });
});
