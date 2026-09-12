import type { DriveDefinition, PhysicsDefinition } from '$lib/physics/types';

export const VIRTUAL_REFERENCE_ROBOT = {
    profileVersion: 1,
    id: 'bioglow-virtual-reference-robot',
    status: 'design-target-uncalibrated',
    purpose: 'A modular simulator reference robot for BIOGLOW mission planning.',
    chassis: {
        widthMm: 180,
        lengthMm: 220,
        heightMm: 120,
        massKg: 1,
        wheelDiameterMm: 56,
        trackWidthMm: 144,
        drivePorts: {
            left: 'B',
            right: 'C'
        }
    },
    attachmentInterface: {
        location: 'front-center',
        widthMm: 80,
        mountingHoleSpacingMm: 40,
        poweredPorts: ['A', 'D'],
        designRules: [
            'Keep the attachment inside the chassis width when possible.',
            'Use passive alignment features before powered actuation.',
            'Keep mission-specific geometry replaceable and independently testable.'
        ]
    },
    attachmentProfiles: [
        { id: 'front-pusher', purpose: 'push or press mission actuators' },
        { id: 'side-hook', purpose: 'pull handles, loops, or flexible elements' },
        { id: 'lift-and-rotate', purpose: 'raise, rotate, or reset mission mechanisms' },
        { id: 'collector', purpose: 'retain or transport loose mission pieces' }
    ]
} as const;

export function createVirtualReferenceRobotPhysics(): PhysicsDefinition {
    const { widthMm, lengthMm, heightMm, massKg } = VIRTUAL_REFERENCE_ROBOT.chassis;
    return {
        bodyType: 'dynamic',
        massKg,
        friction: 0.7,
        restitution: 0,
        enabledRotations: { x: false, y: true, z: false },
        colliders: [
            {
                shape: 'box',
                sizeMm: { x: widthMm, y: heightMm, z: lengthMm },
                positionMm: { x: 0, y: heightMm / 2, z: 0 }
            }
        ]
    };
}

export function createVirtualReferenceRobotDrive(): DriveDefinition {
    const { wheelDiameterMm, trackWidthMm, drivePorts } = VIRTUAL_REFERENCE_ROBOT.chassis;
    return {
        wheelDiameterMm,
        trackWidthMm,
        leftPort: drivePorts.left,
        rightPort: drivePorts.right
    };
}
