import { describe, expect, it } from 'vitest';
import {
    createVirtualReferenceRobotDrive,
    createVirtualReferenceRobotModel,
    createVirtualReferenceRobotPhysics,
    VIRTUAL_REFERENCE_ROBOT
} from '$lib/fll/virtual-reference-robot';

describe('BIOGLOW virtual reference robot', () => {
    it('defines a modular chassis and attachment interface', () => {
        expect(VIRTUAL_REFERENCE_ROBOT.status).toBe('design-target-uncalibrated');
        expect(VIRTUAL_REFERENCE_ROBOT.attachmentInterface.poweredPorts).toEqual(['A', 'D']);
        expect(VIRTUAL_REFERENCE_ROBOT.attachmentProfiles.map(({ id }) => id)).toEqual([
            'front-pusher',
            'side-hook',
            'lift-and-rotate',
            'collector'
        ]);
    });

    it('creates explicit robot physics with a centered chassis collider', () => {
        const physics = createVirtualReferenceRobotPhysics();

        expect(physics).toMatchObject({
            bodyType: 'dynamic',
            massKg: 1,
            enabledRotations: { x: false, y: true, z: false }
        });
        expect(physics.colliders).toEqual([
            {
                shape: 'box',
                sizeMm: { x: 180, y: 120, z: 220 },
                positionMm: { x: 0, y: 60, z: 0 }
            }
        ]);
    });

    it('creates a two-motor drive profile', () => {
        expect(createVirtualReferenceRobotDrive()).toEqual({
            wheelDiameterMm: 56,
            trackWidthMm: 144,
            leftPort: 'B',
            rightPort: 'C'
        });
    });

    it('creates a visible chassis with two drive wheel subparts', () => {
        const model = createVirtualReferenceRobotModel();

        expect(model.name).toBe('bioglow-virtual-reference-robot.ldr');
        expect(model.triangles).toHaveLength(12);
        expect(model.subparts.map(({ port }) => port?.port)).toEqual(['B', 'C']);
        expect(model.subparts.every(({ modelNumber }) => modelNumber === '39367p01.dat')).toBe(
            true
        );
    });
});
