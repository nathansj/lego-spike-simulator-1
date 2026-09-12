import { describe, expect, it } from 'vitest';
import {
    createVirtualReferenceRobotDrive,
    createVirtualReferenceRobotModel,
    createVirtualReferenceRobotPhysics,
    VIRTUAL_REFERENCE_ROBOT,
    VIRTUAL_REFERENCE_ROBOT_LDRAW_PARTS,
    VIRTUAL_REFERENCE_ROBOT_LIBRARY_VERIFICATION
} from '$lib/fll/virtual-reference-robot';

describe('BIOGLOW virtual reference robot', () => {
    it('defines a modular chassis and attachment interface', () => {
        expect(VIRTUAL_REFERENCE_ROBOT.status).toBe('design-target-uncalibrated');
        expect(VIRTUAL_REFERENCE_ROBOT.attachmentInterface.poweredPorts).toEqual(['C', 'D']);
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
                sizeMm: { x: 180, y: 120, z: 220 }
            }
        ]);
    });

    it('creates a two-motor drive profile', () => {
        expect(createVirtualReferenceRobotDrive()).toEqual({
            wheelDiameterMm: 56,
            trackWidthMm: 144,
            leftPort: 'A',
            rightPort: 'B'
        });
    });

    it('creates a visible chassis with drive wheels and attachment hardware', () => {
        const model = createVirtualReferenceRobotModel();

        expect(model.name).toBe('bioglow-virtual-reference-robot.ldr');
        expect(model.triangles).toHaveLength(0);
        expect(model.subparts.filter(({ port }) => port).map(({ port }) => port?.port)).toEqual([
            'A',
            'B',
            'A',
            'B',
            'C',
            'D'
        ]);
        expect(model.subparts.map(({ modelNumber }) => modelNumber)).toEqual([
            '3895.dat',
            '3895.dat',
            '32555.dat',
            '32555.dat',
            '54696.dat',
            '54696.dat',
            '39367p01.dat',
            '39367p01.dat',
            '54696.dat',
            '54696.dat',
            '3895.dat',
            '3895.dat',
            '32555.dat',
            '3895.dat'
        ]);
        expect(model.subparts.every(({ model }) => model !== undefined)).toBe(true);
    });

    it('uses only parts verified in the supplied LDraw and complete libraries', () => {
        const modelPartIds = new Set(modelPartNames(createVirtualReferenceRobotModel()));

        expect([...modelPartIds].sort()).toEqual([...VIRTUAL_REFERENCE_ROBOT_LDRAW_PARTS].sort());
        expect(
            VIRTUAL_REFERENCE_ROBOT_LIBRARY_VERIFICATION.archives.filter(
                ({ status }) => status === 'all-required-parts-present'
            )
        ).toHaveLength(2);
    });
});

function modelPartNames(model: ReturnType<typeof createVirtualReferenceRobotModel>): string[] {
    return [...new Set(model.subparts.map(({ modelNumber }) => modelNumber))];
}
