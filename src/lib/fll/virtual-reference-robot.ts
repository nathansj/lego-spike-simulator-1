import { brickColour, type Model } from '$lib/ldraw/components';
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

function boxTriangles(
    widthMm: number,
    heightMm: number,
    lengthMm: number,
    colour: ReturnType<typeof brickColour>
) {
    const x = widthMm / 2;
    const y = heightMm / 2;
    const z = lengthMm / 2;
    const vertices = [
        { x: -x, y: -y, z: -z },
        { x, y: -y, z: -z },
        { x, y, z: -z },
        { x: -x, y, z: -z },
        { x: -x, y: -y, z: z },
        { x, y: -y, z: z },
        { x, y, z: z },
        { x: -x, y, z: z }
    ];
    const faces = [
        [0, 1, 2, 3],
        [4, 7, 6, 5],
        [0, 4, 5, 1],
        [3, 2, 6, 7],
        [1, 5, 6, 2],
        [0, 3, 7, 4]
    ];
    return faces.flatMap(([a, b, c, d]) => [
        { colour, p1: vertices[a], p2: vertices[b], p3: vertices[c] },
        { colour, p1: vertices[a], p2: vertices[c], p3: vertices[d] }
    ]);
}

function identityMatrix(): number[] {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function createVirtualReferenceRobotModel(): Model {
    const wheelModel: Model = {
        name: 'virtual-reference-wheel.ldr',
        subparts: [],
        lines: [],
        triangles: boxTriangles(12, 56, 56, brickColour('26')),
        quads: [],
        optionalLines: []
    };
    return {
        name: 'bioglow-virtual-reference-robot.ldr',
        subparts: [
            {
                id: -1,
                colour: brickColour('26'),
                matrix: [...identityMatrix().slice(0, 12), -72, 28, 0, 1],
                model: wheelModel,
                modelNumber: '39367p01.dat',
                port: { hub: 'virtual-reference-hub', port: 'B' }
            },
            {
                id: -2,
                colour: brickColour('26'),
                matrix: [...identityMatrix().slice(0, 12), 72, 28, 0, 1],
                model: wheelModel,
                modelNumber: '39367p01.dat',
                port: { hub: 'virtual-reference-hub', port: 'C' }
            }
        ],
        lines: [],
        triangles: boxTriangles(
            VIRTUAL_REFERENCE_ROBOT.chassis.widthMm,
            VIRTUAL_REFERENCE_ROBOT.chassis.heightMm,
            VIRTUAL_REFERENCE_ROBOT.chassis.lengthMm,
            brickColour('1')
        ),
        quads: [],
        optionalLines: []
    };
}
