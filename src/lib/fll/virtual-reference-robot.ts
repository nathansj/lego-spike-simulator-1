import { brickColour, resolveSubpart, type Model, type Subpart } from '$lib/ldraw/components';
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
    const fallbackModels = {
        beam: {
            name: 'fallback-technic-liftarm.ldr',
            subparts: [],
            lines: [],
            triangles: boxTriangles(176, 16, 16, brickColour('7')),
            quads: [],
            optionalLines: []
        } as Model,
        motor: {
            name: 'fallback-spike-motor.ldr',
            subparts: [],
            lines: [],
            triangles: boxTriangles(32, 28, 48, brickColour('1')),
            quads: [],
            optionalLines: []
        } as Model,
        wheel: {
            name: 'fallback-spike-wheel.ldr',
            subparts: [],
            lines: [],
            triangles: boxTriangles(12, 56, 56, brickColour('26')),
            quads: [],
            optionalLines: []
        } as Model
    };

    const part = (
        id: number,
        modelNumber: string,
        matrix: number[],
        fallback: Model,
        colour: ReturnType<typeof brickColour>,
        port?: 'B' | 'C'
    ): Subpart => {
        const subpart: Subpart = {
            id,
            colour,
            matrix,
            model: fallback,
            modelNumber,
            port: port ? { hub: 'virtual-reference-hub', port } : undefined
        };
        resolveSubpart(subpart);
        return subpart;
    };

    const model: Model = {
        name: 'bioglow-virtual-reference-robot.ldr',
        subparts: [
            part(-1, '32555.dat', [...identityMatrix().slice(0, 12), 0, 8, -70, 1], fallbackModels.beam, brickColour('7')),
            part(-2, '32555.dat', [...identityMatrix().slice(0, 12), 0, 8, 70, 1], fallbackModels.beam, brickColour('7')),
            part(-3, '32555.dat', [...identityMatrix().slice(0, 12), -72, 8, 0, 1], fallbackModels.beam, brickColour('7')),
            part(-4, '54696.dat', [...identityMatrix().slice(0, 12), -40, 48, 0, 1], fallbackModels.motor, brickColour('1')),
            part(-5, '54696.dat', [...identityMatrix().slice(0, 12), 40, 48, 0, 1], fallbackModels.motor, brickColour('1')),
            part(-6, '39367p01.dat', [...identityMatrix().slice(0, 12), -72, 28, 0, 1], fallbackModels.wheel, brickColour('26'), 'B'),
            part(-7, '39367p01.dat', [...identityMatrix().slice(0, 12), 72, 28, 0, 1], fallbackModels.wheel, brickColour('26'), 'C')
        ],
        lines: [],
        triangles: [],
        quads: [],
        optionalLines: []
    };
    return model;
}
